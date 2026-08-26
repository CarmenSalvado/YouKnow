import asyncio
from types import SimpleNamespace

from app.config import Settings
from app.mock_data import QUANTUM_CONCEPTS, QUANTUM_DEPENDENCIES
from app.models import (
    AnalyzedConcept,
    GeneratePlanRequest,
    RelationshipRepair,
    SourceAnalysis,
)
from app.services.llm import OpenAILLMClient
from app.services.plan_service import PlanService


def quantum_analysis(*, invalid_prerequisite: bool = False) -> SourceAnalysis:
    concepts = [
        AnalyzedConcept(**concept.model_dump(exclude={"level"}))
        for concept in QUANTUM_CONCEPTS
    ]
    dependencies = [dependency.model_copy(deep=True) for dependency in QUANTUM_DEPENDENCIES]
    if invalid_prerequisite:
        dependencies[0].prerequisites.append("missing_concept")
    return SourceAnalysis(
        title="AI Quantum Computing",
        concepts=concepts,
        dependencies=dependencies,
    )


class FakeLLMClient:
    def __init__(self, *responses) -> None:
        self.responses = list(responses)
        self.calls = []

    async def structured_completion(self, **kwargs):
        self.calls.append(kwargs)
        return self.responses.pop(0)


def settings() -> Settings:
    return Settings(app_env="development", llm_api_key=None, llm_model=None)


def test_ai_analysis_flows_into_deterministic_graph_and_schedule() -> None:
    llm = FakeLLMClient(quantum_analysis())
    plan = asyncio.run(
        PlanService(settings(), llm).generate(
            GeneratePlanRequest.model_validate(
                {
                    "source": {"type": "topic", "value": "Quantum Computing"},
                    "preferences": {"minutes_per_day": 30, "start_date": "2026-08-27"},
                }
            )
        )
    )

    position = {concept.id: index for index, concept in enumerate(plan.concepts)}
    assert plan.title == "AI Quantum Computing"
    assert plan.concepts[-1].id == "quantum_applications"
    assert plan.concepts[-1].level >= 4
    assert all(position[edge.from_concept] < position[edge.to_concept] for edge in plan.edges)
    assert plan.statistics.total_sessions == len(plan.schedule)
    assert len(llm.calls) == 1
    assert "Do not generate a calendar" in llm.calls[0]["system_prompt"]


def test_document_external_prerequisite_is_preserved() -> None:
    analysis = quantum_analysis()
    analysis.concepts[0].external_prerequisite = True
    llm = FakeLLMClient(analysis)
    plan = asyncio.run(
        PlanService(settings(), llm).generate(
            GeneratePlanRequest.model_validate(
                {
                    "source": {"type": "text", "value": "A document introducing qubits and quantum gates."},
                    "preferences": {"start_date": "2026-08-27"},
                }
            )
        )
    )

    assert next(concept for concept in plan.concepts if concept.id == "linear_algebra").external_prerequisite is True
    assert "external_prerequisite=true" in llm.calls[0]["user_prompt"]


def test_invalid_relationships_are_repaired_without_changing_concepts() -> None:
    llm = FakeLLMClient(
        quantum_analysis(invalid_prerequisite=True),
        RelationshipRepair(dependencies=QUANTUM_DEPENDENCIES),
    )
    plan = asyncio.run(
        PlanService(settings(), llm).generate(
            GeneratePlanRequest.model_validate(
                {
                    "source": {"type": "topic", "value": "Quantum Computing"},
                    "preferences": {"start_date": "2026-08-27"},
                }
            )
        )
    )

    assert len(plan.concepts) == len(QUANTUM_CONCEPTS)
    assert len(llm.calls) == 2
    assert llm.calls[1]["response_model"] is RelationshipRepair


def test_openai_client_retries_invalid_structured_output_once() -> None:
    valid = RelationshipRepair(dependencies=[])

    class FakeResponses:
        def __init__(self) -> None:
            self.calls = 0

        async def parse(self, **kwargs):
            self.calls += 1
            output = {"wrong": []} if self.calls == 1 else valid
            return SimpleNamespace(output_parsed=output)

    responses = FakeResponses()
    sdk_client = SimpleNamespace(responses=responses)
    result = asyncio.run(
        OpenAILLMClient(api_key="test", model="test", client=sdk_client).structured_completion(
            system_prompt="system",
            user_prompt="user",
            response_model=RelationshipRepair,
        )
    )

    assert result == valid
    assert responses.calls == 2

