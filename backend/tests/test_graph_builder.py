import pytest

from app.mock_data import QUANTUM_CONCEPTS, QUANTUM_DEPENDENCIES
from app.models import Concept, ConceptCategory, Dependency
from app.services.graph_builder import GraphValidationError, build_graph


def concept(concept_id: str) -> Concept:
    return Concept(
        id=concept_id,
        name=concept_id.title(),
        description="Test concept",
        difficulty=1,
        estimated_minutes=30,
        category=ConceptCategory.FOUNDATION,
        source_evidence="Test evidence",
    )


def test_topological_order_and_levels_respect_prerequisites() -> None:
    result = build_graph(QUANTUM_CONCEPTS, QUANTUM_DEPENDENCIES)
    position = {concept_id: index for index, concept_id in enumerate(result.order)}

    for edge in result.edges:
        assert position[edge.from_concept] < position[edge.to_concept]
        assert result.levels[edge.from_concept] < result.levels[edge.to_concept]
    assert result.levels["linear_algebra"] == 0
    assert result.levels["quantum_applications"] >= 4


def test_cycle_detection() -> None:
    concepts = [concept("alpha"), concept("beta"), concept("gamma")]
    dependencies = [
        Dependency(concept_id="alpha", prerequisites=["gamma"]),
        Dependency(concept_id="beta", prerequisites=["alpha"]),
        Dependency(concept_id="gamma", prerequisites=["beta"]),
    ]

    with pytest.raises(GraphValidationError, match="cycle detected"):
        build_graph(concepts, dependencies)


def test_invalid_prerequisite_id() -> None:
    with pytest.raises(GraphValidationError, match="unknown prerequisite ID"):
        build_graph(
            [concept("known")],
            [Dependency(concept_id="known", prerequisites=["missing"])],
        )


def test_build_graph_connects_components_without_dropping_concepts() -> None:
    connected = build_graph(
        [concept("alpha"), concept("beta"), concept("gamma"), concept("orphan")],
        [
            Dependency(concept_id="beta", prerequisites=["alpha"]),
            Dependency(concept_id="gamma", prerequisites=["beta"]),
        ],
    )

    assert connected.order == ["alpha", "beta", "gamma", "orphan"]
    assert [(edge.from_concept, edge.to_concept) for edge in connected.edges] == [("alpha", "beta"), ("beta", "gamma"), ("gamma", "orphan")]
