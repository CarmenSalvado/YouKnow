from __future__ import annotations

import asyncio
from uuid import uuid4

from app.config import Settings
from app.mock_data import QUANTUM_CONCEPTS, QUANTUM_DEPENDENCIES
from app.models import Concept, Dependency, GeneratePlanRequest, NormalizedSource, PlanResponse, SourceType, StudyPreferences
from app.services.concept_extraction import ConceptAnalysisService, to_domain_concepts
from app.services.graph_builder import GraphResult, GraphValidationError, build_graph
from app.services.llm import LLMClient, OpenAILLMClient
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
        self.analysis_service = (
            ConceptAnalysisService(llm_client, max_source_chars=settings.max_source_chars)
            if llm_client
            else None
        )

    async def generate(self, request: GeneratePlanRequest) -> PlanResponse:
        source = await asyncio.to_thread(normalize_source, request.source)
        return await self.generate_normalized(source, request.preferences)

    async def generate_normalized(
        self,
        source: NormalizedSource,
        preferences: StudyPreferences,
    ) -> PlanResponse:
        if self.analysis_service:
            analysis = await self.analysis_service.analyze(source)
            concepts = to_domain_concepts(analysis)
            graph = await self._validated_ai_graph(concepts, analysis.dependencies)
            return self._plan(analysis.title, graph, preferences)

        if not self.settings.is_development:
            raise PlanGenerationUnavailable("LLM_API_KEY is required outside development")
        if source.source_type is SourceType.TOPIC and source.title.casefold() in {
            "quantum computing",
            "computación cuántica",
        }:
            return self._plan(
                "Quantum Computing",
                build_graph(QUANTUM_CONCEPTS, QUANTUM_DEPENDENCIES),
                preferences,
            )
        raise PlanGenerationUnavailable(
            "No LLM is configured for this source. The development fallback currently supports only the Quantum Computing mock."
        )

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
    def _plan(title: str, graph: GraphResult, preferences: StudyPreferences) -> PlanResponse:
        schedule, statistics = create_schedule(graph.concepts, preferences)
        return PlanResponse(
            id=str(uuid4()),
            title=title,
            concepts=graph.concepts,
            edges=graph.edges,
            schedule=schedule,
            statistics=statistics,
        )
