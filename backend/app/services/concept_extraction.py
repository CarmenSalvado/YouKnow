from __future__ import annotations

from app.models import (
    Concept,
    Dependency,
    NormalizedSource,
    RelationshipRepair,
    SourceAnalysis,
    SourceType,
)
from app.services.llm import LLMClient


SYSTEM_PROMPT = """You are a knowledge-structure analyst.
Your only job is to identify meaningful concepts, estimate their difficulty and study time, and propose prerequisite relationships.

Rules:
- Return the minimum sufficient set of 4 to 25 substantial concepts. Never pad the route to reach a quota.
- Let scope determine the count: a narrow concept may need 4 to 8 stations; a broad discipline may need 15 to 25.
- Use concrete, domain-specific concept names. Avoid generic filler such as orientation, overview, key vocabulary, or core principles.
- Use stable snake_case IDs.
- Categories are foundation, core, advanced, or application.
- Difficulty is an integer from 1 to 5.
- estimated_minutes is realistic focused study time in minutes, considering difficulty, conceptual depth, and source coverage.
- A prerequisite must be conceptually necessary before the dependent concept.
- Include prerequisite stations needed for a motivated beginner to understand the requested destination, even when the user did not name them.
- Every prerequisite ID must match an extracted concept ID exactly.
- Do not create self-dependencies or duplicate prerequisites.
- Do not generate a calendar, study sessions, final order, levels, or a roadmap. Python calculates those.
"""


class ConceptAnalysisService:
    def __init__(self, llm: LLMClient, *, max_source_chars: int = 80_000) -> None:
        self.llm = llm
        self.max_source_chars = max_source_chars

    async def analyze(self, source: NormalizedSource) -> SourceAnalysis:
        if source.source_type is SourceType.TOPIC:
            task = f"""Expand this requested subject into the knowledge necessary to understand it:

TOPIC: {source.title}

Treat the requested subject itself as the destination and include it as a concept. Every other station must be a genuinely necessary prerequisite, practice step, or application for that destination; omit adjacent trivia and business topics unless the request requires them.
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


def to_domain_concepts(analysis: SourceAnalysis) -> list[Concept]:
    return [Concept(**concept.model_dump()) for concept in analysis.concepts]
