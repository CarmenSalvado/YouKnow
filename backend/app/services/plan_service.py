from __future__ import annotations

import asyncio
from uuid import uuid4

from app.config import Settings
from app.mock_data import QUANTUM_CONCEPTS, QUANTUM_DEPENDENCIES
from app.models import Concept, ConceptCategory, Dependency, GeneratePlanRequest, GenerationMode, NormalizedSource, PlanResponse, SourceType, StudyPreferences
from app.services.concept_extraction import ConceptAnalysisService, to_domain_concepts
from app.services.graph_builder import GraphResult, GraphValidationError, build_graph
from app.services.llm import LLMClient, LLMClientError, OllamaLLMClient, OpenAILLMClient
from app.services.scheduler import create_schedule
from app.services.source_ingestion import normalize_source


class PlanGenerationUnavailable(RuntimeError):
    pass


class PlanAnalysisError(RuntimeError):
    pass


class PlanService:
    def __init__(self, settings: Settings, llm_client: LLMClient | None = None) -> None:
        self.settings = settings
        if llm_client is None and settings.llm_api_key and settings.llm_model:
            llm_client = OpenAILLMClient(
                api_key=settings.llm_api_key,
                model=settings.llm_model,
                base_url=settings.llm_base_url,
            )
        elif llm_client is None and settings.ollama_model:
            llm_client = OllamaLLMClient(model=settings.ollama_model, base_url=settings.ollama_base_url)
        self.analysis_service = (
            ConceptAnalysisService(llm_client, max_source_chars=settings.max_source_chars)
            if llm_client
            else None
        )

    async def generate(self, request: GeneratePlanRequest) -> PlanResponse:
        source = await asyncio.to_thread(normalize_source, request.source) if request.source.type is SourceType.YOUTUBE else normalize_source(request.source)
        return await self.generate_normalized(source, request.preferences)

    async def generate_normalized(
        self,
        source: NormalizedSource,
        preferences: StudyPreferences,
    ) -> PlanResponse:
        if self.analysis_service:
            try:
                analysis = await self.analysis_service.analyze(source)
                concepts = to_domain_concepts(analysis)
                graph = await self._validated_ai_graph(concepts, analysis.dependencies)
                return self._plan(analysis.title, graph, preferences, GenerationMode.AI)
            except (LLMClientError, PlanAnalysisError, GraphValidationError):
                pass

        if source.source_type is SourceType.TOPIC and source.title.casefold() in {
            "quantum computing",
            "computación cuántica",
        }:
            return self._plan(
                "Quantum Computing",
                build_graph(QUANTUM_CONCEPTS, QUANTUM_DEPENDENCIES),
                preferences,
                GenerationMode.CURATED,
            )
        return self._plan(source.title, self._local_graph(source), preferences, GenerationMode.STRUCTURAL)

    @staticmethod
    def _local_graph(source: NormalizedSource) -> GraphResult:
        topic = " ".join(source.title.split())[:60]
        evidence = (
            f"Requested learning goal: {topic}."
            if source.source_type is SourceType.TOPIC
            else f"Included to structure the supplied {source.source_type.value} source."
        )
        steps = [
            ("orientation", f"{topic}: Orientation", "Define the scope, desired outcome, and a useful mental map.", 30, ConceptCategory.FOUNDATION, []),
            ("vocabulary", f"{topic}: Key Vocabulary", "Learn the terms needed to read, discuss, and search the subject confidently.", 60, ConceptCategory.FOUNDATION, ["orientation"]),
            ("foundations", f"Foundations of {topic}", "Build the background knowledge that later ideas rely on.", 90, ConceptCategory.FOUNDATION, ["orientation"]),
            ("tools", f"Tools for {topic}", "Set up the methods, references, or practical tools used in the field.", 60, ConceptCategory.CORE, ["foundations"]),
            ("core_principles", f"Core Principles of {topic}", "Understand the central ideas and how they connect.", 120, ConceptCategory.CORE, ["vocabulary", "foundations"]),
            ("mental_models", f"{topic}: Mental Models", "Turn isolated facts into reusable patterns for reasoning.", 90, ConceptCategory.CORE, ["core_principles"]),
            ("guided_practice", f"Guided {topic} Practice", "Apply the core ideas in small, worked exercises.", 120, ConceptCategory.CORE, ["tools", "core_principles"]),
            ("pitfalls", f"Common {topic} Pitfalls", "Recognize frequent mistakes, misconceptions, and recovery strategies.", 60, ConceptCategory.ADVANCED, ["guided_practice"]),
            ("integration", f"Integrating {topic} Skills", "Combine the main concepts in larger, less guided problems.", 120, ConceptCategory.ADVANCED, ["mental_models", "guided_practice", "pitfalls"]),
            ("advanced", f"Advanced {topic}", "Explore deeper techniques and choose a direction for specialization.", 120, ConceptCategory.ADVANCED, ["integration"]),
            ("applications", f"Real-World {topic}", "Study representative uses and evaluate when the subject is useful.", 90, ConceptCategory.APPLICATION, ["integration"]),
            ("capstone", f"{topic} Capstone", "Complete one end-to-end project and identify the next learning loop.", 180, ConceptCategory.APPLICATION, ["advanced", "applications"]),
        ]
        concepts = [
            Concept(id=concept_id, name=name, description=description, difficulty=min(5, 1 + index // 3), estimated_minutes=minutes, category=category, source_evidence=evidence)
            for index, (concept_id, name, description, minutes, category, _) in enumerate(steps)
        ]
        dependencies = [Dependency(concept_id=concept_id, prerequisites=prerequisites) for concept_id, *_, prerequisites in steps]
        return build_graph(concepts, dependencies)

    async def _validated_ai_graph(
        self,
        concepts: list[Concept],
        dependencies: list[Dependency],
    ) -> GraphResult:
        try:
            return build_graph(concepts, dependencies)
        except GraphValidationError as error:
            if "cycle detected" in str(error):
                return build_graph(concepts, dependencies, repair_cycles=True)
            assert self.analysis_service is not None
            repaired = await self.analysis_service.repair_relationships(
                concept_ids=[concept.id for concept in concepts],
                dependencies=dependencies,
                problem=str(error),
            )
            try:
                return build_graph(concepts, repaired.dependencies, repair_cycles=True)
            except GraphValidationError as repaired_error:
                raise PlanAnalysisError(f"LLM relationships remained invalid: {repaired_error}") from repaired_error

    @staticmethod
    def _plan(title: str, graph: GraphResult, preferences: StudyPreferences, generation_mode: GenerationMode) -> PlanResponse:
        schedule, statistics = create_schedule(graph.concepts, preferences)
        return PlanResponse(
            id=str(uuid4()),
            title=title,
            generation_mode=generation_mode,
            concepts=graph.concepts,
            edges=graph.edges,
            schedule=schedule,
            statistics=statistics,
        )
