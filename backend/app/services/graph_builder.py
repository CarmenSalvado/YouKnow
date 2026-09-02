from __future__ import annotations

from dataclasses import dataclass

import networkx as nx

from app.models import Concept, Dependency, Edge


class GraphValidationError(ValueError):
    pass


@dataclass(frozen=True)
class GraphResult:
    concepts: list[Concept]
    edges: list[Edge]
    order: list[str]
    levels: dict[str, int]
    removed_edges: tuple[Edge, ...] = ()


def build_graph(
    concepts: list[Concept],
    dependencies: list[Dependency],
    *,
    repair_cycles: bool = False,
) -> GraphResult:
    if not concepts:
        raise GraphValidationError("at least one concept is required")

    concept_by_id = {concept.id: concept for concept in concepts}
    if len(concept_by_id) != len(concepts):
        raise GraphValidationError("concept IDs must be unique")

    graph = nx.DiGraph()
    graph.add_nodes_from(concept_by_id)
    edges: set[tuple[str, str]] = set()

    for dependency in dependencies:
        if dependency.concept_id not in concept_by_id:
            raise GraphValidationError(f"unknown concept ID: {dependency.concept_id}")
        for prerequisite_id in dependency.prerequisites:
            if prerequisite_id not in concept_by_id:
                raise GraphValidationError(f"unknown prerequisite ID: {prerequisite_id}")
            if prerequisite_id == dependency.concept_id:
                raise GraphValidationError(f"self dependency: {prerequisite_id}")
            edge = (prerequisite_id, dependency.concept_id)
            if edge in edges:
                raise GraphValidationError(f"duplicate edge: {prerequisite_id} -> {dependency.concept_id}")
            edges.add(edge)
            graph.add_edge(*edge)

    index = {concept.id: position for position, concept in enumerate(concepts)}
    removed: list[Edge] = []
    while not nx.is_directed_acyclic_graph(graph):
        cycle = nx.find_cycle(graph)
        if not repair_cycles:
            path = " -> ".join([edge[0] for edge in cycle] + [cycle[0][0]])
            raise GraphValidationError(f"cycle detected: {path}")
        edge = max(cycle, key=lambda pair: index[pair[0]] - index[pair[1]])
        graph.remove_edge(*edge)
        edges.remove(edge)
        removed.append(Edge(from_concept=edge[0], to_concept=edge[1]))

    components = sorted(nx.weakly_connected_components(graph), key=lambda component: min(index[item] for item in component))
    for left, right in zip(components, components[1:]):
        source = max((item for item in left if graph.out_degree(item) == 0), key=index.__getitem__)
        target = min((item for item in right if graph.in_degree(item) == 0), key=index.__getitem__)
        graph.add_edge(source, target)
        edges.add((source, target))

    order = list(nx.lexicographical_topological_sort(graph, key=index.__getitem__))
    levels: dict[str, int] = {}
    for concept_id in order:
        levels[concept_id] = max((levels[parent] + 1 for parent in graph.predecessors(concept_id)), default=0)

    ordered_concepts = [
        concept_by_id[concept_id].model_copy(update={"level": levels[concept_id]})
        for concept_id in order
    ]
    ordered_edges = [
        Edge(from_concept=source, to_concept=target)
        for source, target in sorted(edges, key=lambda edge: (index[edge[1]], index[edge[0]]))
    ]
    return GraphResult(ordered_concepts, ordered_edges, order, levels, tuple(removed))
