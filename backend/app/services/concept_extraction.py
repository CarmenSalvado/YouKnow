from __future__ import annotations

from app.models import (
    Concept,
    Dependency,
    NormalizedSource,
    PrerequisiteAnalysis,
    RequiredPathConcept,
    RequiredPathResponse,
    RelationshipRepair,
    SourceAnalysis,
    SourceType,
)
from app.services.llm import LLMClient


SYSTEM_PROMPT = """You are a knowledge-structure analyst.
Your only job is to identify meaningful concepts, estimate their difficulty and study time, and propose prerequisite relationships.

Rules:
- Return 12 to 24 substantial concepts. Cover the route broadly enough to be useful from the first map.
- Use concrete, domain-specific concept names. Avoid generic filler such as orientation, overview, key vocabulary, or core principles.
- Use stable snake_case IDs.
- Categories are foundation, core, advanced, or application.
- Difficulty is an integer from 1 to 5.
- estimated_minutes is realistic focused study time in minutes, considering difficulty, conceptual depth, and source coverage.
- A prerequisite must be conceptually necessary before the dependent concept.
- Include prerequisite stations needed for a motivated beginner to understand the requested destination, even when the user did not name them.
- Every prerequisite ID must match an extracted concept ID exactly.
- Do not create self-dependencies or duplicate prerequisites.
- Return one weakly connected DAG: every metro line must join another line through a prerequisite or the shared destination.
- Do not generate a calendar, study sessions, final order, levels, or a roadmap. Python calculates those.
- Organize every concept into exactly one coherent metro line.
- Give each line a short, memorable, subject-specific name. Never use generic names such as Foundation, Core, Advanced, or Application.
- Create 3 to 6 lines for a complete map, and list every concept ID exactly once across them.
"""

PREREQUISITE_SYSTEM_PROMPT = """You design the track that must come before one learning destination.
Return only genuinely necessary prerequisite concepts, never the destination itself, later applications, optional enrichment, or concepts already present in the route.
There is no target count and no minimum: return zero when the route already covers everything, few stations for a narrow gap, and many only when the destination genuinely requires them. Never pad.
Use concrete domain-specific names, stable snake_case IDs, realistic focused-study minutes, and only prerequisite relationships whose IDs are in the response.
Organize every returned concept into exactly one coherent metro line. Give each line a short, memorable, subject-specific name; never call a line Foundation, Core, Advanced, or Application.
Do not generate a calendar, sessions, levels, or the destination node. Python validates, orders, and schedules the result.
"""


class ConceptAnalysisService:
    def __init__(self, llm: LLMClient, *, max_source_chars: int = 80_000) -> None:
        self.llm = llm
        self.max_source_chars = max_source_chars

    async def analyze(self, source: NormalizedSource) -> SourceAnalysis:
        if source.source_type is SourceType.TOPIC:
            task = f"""Expand this requested subject into the knowledge necessary to understand it:

TOPIC: {source.title}

Treat the requested subject itself as the destination, but do not include it as a concept: the backend adds that exact end-goal node. Every returned station must be a genuinely necessary prerequisite, practice step, or application for that destination; omit adjacent trivia and business topics unless the request requires them.
Return at most 23 concepts so the added end-goal stays within the 24-station map templates.
Cover foundations, core ideas, advanced ideas, and representative applications only where appropriate.
Set external_prerequisite=false for every concept because this is a topic expansion.
For source_evidence, briefly explain why the concept is necessary for understanding the topic."""
        else:
            # ponytail: one-pass source cap; use chunked map/reduce when long-document recall becomes a product requirement.
            content = source.content[: self.max_source_chars]
            truncation = "\nThe source was truncated to the configured analysis limit." if len(source.content) > len(content) else ""
            task = f"""Analyze the following {source.source_type.value} source.
Extract concepts primarily from its content. You may add only genuinely required prerequisite concepts that the source assumes but does not explain.
Set external_prerequisite=true only for those added prerequisites; set it to false for concepts present in the source.
For source_evidence, give a short, specific excerpt or close paraphrase. For an external prerequisite, explain what source concept requires it.
{truncation}

TITLE: {source.title}
SOURCE CONTENT:
---
{content}
---"""

        return await self.llm.structured_completion(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=task,
            response_model=SourceAnalysis,
        )

    async def analyze_prerequisites(
        self,
        destination: str,
        existing_concepts: list[str],
    ) -> PrerequisiteAnalysis:
        return await self.llm.structured_completion(
            system_prompt=PREREQUISITE_SYSTEM_PROMPT,
            user_prompt=(
                f"DESTINATION: {destination}\n"
                f"CONCEPTS ALREADY ON THE MAP: {existing_concepts}\n\n"
                "Choose the complete minimum set that a motivated beginner still needs before this destination. "
                "For source_evidence, explain briefly why each station is required. Set external_prerequisite=false."
            ),
            response_model=PrerequisiteAnalysis,
        )

    async def select_required_path(
        self,
        destination_id: str,
        destination: str,
        concepts: list[RequiredPathConcept],
        edges: list[dict[str, str]],
    ) -> RequiredPathResponse:
        return await self.llm.structured_completion(
            system_prompt=(
                "You select a minimum prerequisite path inside an existing learning map. "
                "Return only concept IDs from the supplied map, always including the destination ID. "
                "Include every concept transitively required by the map relationships, and no unrelated or downstream concepts."
            ),
            user_prompt=(
                f"DESTINATION ID: {destination_id}\nDESTINATION: {destination}\n"
                f"MAP CONCEPTS: {[concept.model_dump() for concept in concepts]}\n"
                f"PREREQUISITE EDGES (from -> to): {edges}\n"
                "Return the complete minimum required path as concept_ids."
            ),
            response_model=RequiredPathResponse,
        )

    async def repair_relationships(
        self,
        concept_ids: list[str],
        dependencies: list[Dependency],
        problem: str,
    ) -> RelationshipRepair:
        return await self.llm.structured_completion(
            system_prompt=(
                "Repair only prerequisite relationships. Do not add, remove, rename, reorder, or modify concepts. "
                "Do not create a schedule or learning order."
            ),
            user_prompt=(
                f"Allowed concept IDs: {concept_ids}\n"
                f"Validation problem: {problem}\n"
                f"Current relationships: {[dependency.model_dump() for dependency in dependencies]}\n"
                "Return corrected prerequisite relationships using only allowed IDs."
            ),
            response_model=RelationshipRepair,
        )


def to_domain_concepts(analysis: SourceAnalysis | PrerequisiteAnalysis) -> list[Concept]:
    return [Concept(**concept.model_dump()) for concept in analysis.concepts]
