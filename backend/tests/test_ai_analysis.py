import asyncio
from types import SimpleNamespace

from app.config import Settings
from app.mock_data import QUANTUM_CONCEPTS, QUANTUM_DEPENDENCIES
from app.models import (
    AnalyzedConcept,
    Dependency,
    ExpandLineRequest,
    GeneratePlanRequest,
    LearningLine,
    PrerequisiteAnalysis,
    RelationshipRepair,
    SourceAnalysis,
)
from app.services.llm import CompatibleLLMClient, LLMClientError, OpenAILLMClient
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
    assert plan.title == "Quantum Computing"
    assert plan.goal_concept_id == "learning_goal"
    assert plan.concepts[-1].name == "Quantum Computing"
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

    assert len(plan.concepts) == len(QUANTUM_CONCEPTS) + 1
    assert plan.goal_concept_id == "learning_goal"
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


def test_analyzed_concept_uses_safe_defaults_for_omitted_llm_fields() -> None:
    concept = AnalyzedConcept.model_validate({
        "id": "heat_transfer_methods",
        "name": "Heat Transfer Methods",
        "description": "Conduction, convection, and radiation in cooking.",
        "estimated_minutes": 30,
        "category": "core",
    })

    assert (concept.difficulty, concept.source_evidence, concept.external_prerequisite) == (
        3,
        "No source evidence provided.",
        False,
    )


def test_compatible_client_requests_and_validates_json() -> None:
    valid = RelationshipRepair(dependencies=[])

    class FakeCompletions:
        async def create(self, **kwargs):
            assert kwargs["response_format"] == {"type": "json_object"}
            assert "Return only JSON matching this schema" in kwargs["messages"][0]["content"]
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=valid.model_dump_json()))])

    sdk_client = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    result = asyncio.run(
        CompatibleLLMClient(api_key="test", model="test-model", base_url="https://example.com", client=sdk_client).structured_completion(
            system_prompt="system",
            user_prompt="user",
            response_model=RelationshipRepair,
        )
    )

    assert result == valid


def test_arbitrary_topic_generates_custom_local_plan_without_llm() -> None:
    plan = asyncio.run(
        PlanService(settings()).generate(
            GeneratePlanRequest.model_validate(
                {
                    "source": {"type": "topic", "value": "Urban Beekeeping"},
                    "preferences": {"minutes_per_day": 45, "start_date": "2026-08-27"},
                }
            )
        )
    )

    assert plan.title == "Urban Beekeeping"
    assert len(plan.concepts) == 13
    assert all("Urban Beekeeping" in concept.name for concept in plan.concepts)
    assert plan.goal_concept_id == "learning_goal"
    assert plan.concepts[-1].name == "Urban Beekeeping"
    assert plan.statistics.total_sessions == len(plan.schedule)


def test_llm_failure_falls_back_to_local_plan() -> None:
    class FailingLLM:
        async def structured_completion(self, **kwargs):
            raise LLMClientError("offline")

    plan = asyncio.run(
        PlanService(settings(), FailingLLM()).generate(
            GeneratePlanRequest.model_validate(
                {
                    "source": {"type": "text", "value": "Mycology notes\nFungi, spores, hyphae, and ecosystems."},
                    "preferences": {"start_date": "2026-08-27"},
                }
            )
        )
    )

    assert plan.title == "Mycology notes"
    assert len(plan.concepts) == 12
    assert plan.concepts[0].name == "Mycology notes: Orientation"


def test_disconnected_topic_is_connected_without_losing_concepts() -> None:
    analysis = quantum_analysis().model_copy(
        update={
            "title": "Binary Search",
            "concepts": quantum_analysis().concepts[:12],
            "dependencies": [],
        }
    )
    plan = asyncio.run(
        PlanService(settings(), FakeLLMClient(analysis)).generate(
            GeneratePlanRequest.model_validate(
                {
                    "source": {"type": "topic", "value": "Binary Search"},
                    "preferences": {"start_date": "2026-08-27"},
                }
            )
        )
    )

    assert plan.title == "Binary Search"
    assert len(plan.concepts) == 13
    assert len(plan.edges) == 12
    assert {concept.id for concept in plan.concepts[:-1]} == {concept.id for concept in analysis.concepts}
    assert plan.concepts[-1].name == "Binary Search"


def test_expansion_count_and_named_lines_come_from_analysis() -> None:
    concepts = quantum_analysis().concepts[:2]
    analysis = PrerequisiteAnalysis(
        concepts=concepts,
        dependencies=[Dependency(concept_id=concepts[1].id, prerequisites=[concepts[0].id])],
        lines=[LearningLine(
            id="mathematical_tools",
            name="Mathematical Tools",
            description="The mathematical language needed before the destination.",
            concept_ids=[concept.id for concept in concepts],
        )],
    )
    expansion = asyncio.run(
        PlanService(settings(), FakeLLMClient(analysis)).expand(
            ExpandLineRequest(destination="Quantum Gates", existing_concepts=[])
        )
    )

    assert len(expansion.concepts) == 2
    assert expansion.lines[0].name == "Mathematical Tools"
    assert expansion.connector_concept_ids == [concepts[1].id]
