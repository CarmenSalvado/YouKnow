from app.models import Concept, ConceptCategory, Dependency


QUANTUM_CONCEPTS = [
    Concept(id="linear_algebra", name="Linear Algebra", description="Vectors, matrices, bases, and linear transformations.", difficulty=2, estimated_minutes=120, category=ConceptCategory.FOUNDATION, source_evidence="Quantum states and gates are represented with vectors and matrices."),
    Concept(id="complex_numbers", name="Complex Numbers", description="Complex arithmetic, polar form, and phase.", difficulty=2, estimated_minutes=60, category=ConceptCategory.FOUNDATION, source_evidence="Quantum amplitudes are complex-valued."),
    Concept(id="probability", name="Probability", description="Probability distributions, conditional probability, and expectation.", difficulty=2, estimated_minutes=90, category=ConceptCategory.FOUNDATION, source_evidence="Measurement outcomes are probabilistic."),
    Concept(id="classical_computation", name="Classical Computation", description="Bits, logic gates, circuits, and computational complexity.", difficulty=2, estimated_minutes=75, category=ConceptCategory.FOUNDATION, source_evidence="Quantum computation is compared with classical computational models."),
    Concept(id="tensor_products", name="Tensor Products", description="Composite vector spaces and multi-system state representation.", difficulty=3, estimated_minutes=90, category=ConceptCategory.FOUNDATION, source_evidence="Multiple qubits are combined with tensor products."),
    Concept(id="quantum_states", name="Quantum States", description="State vectors, normalization, phase, and the Bloch sphere.", difficulty=3, estimated_minutes=105, category=ConceptCategory.CORE, source_evidence="A quantum system is described by a normalized state vector."),
    Concept(id="qubits", name="Qubits", description="Two-level quantum systems and superposition.", difficulty=3, estimated_minutes=75, category=ConceptCategory.CORE, source_evidence="The qubit is the basic unit of quantum information."),
    Concept(id="quantum_measurement", name="Quantum Measurement", description="Measurement bases, probabilities, and state collapse.", difficulty=3, estimated_minutes=75, category=ConceptCategory.CORE, source_evidence="Measurements convert quantum states into classical outcomes."),
    Concept(id="quantum_gates", name="Quantum Gates", description="Single- and multi-qubit unitary operations.", difficulty=3, estimated_minutes=90, category=ConceptCategory.CORE, source_evidence="Quantum programs manipulate qubits through unitary gates."),
    Concept(id="entanglement", name="Entanglement", description="Non-separable states and quantum correlations.", difficulty=4, estimated_minutes=105, category=ConceptCategory.CORE, source_evidence="Entanglement enables correlations unavailable to classical systems."),
    Concept(id="quantum_circuits", name="Quantum Circuits", description="Circuit composition, registers, measurement, and execution.", difficulty=4, estimated_minutes=120, category=ConceptCategory.CORE, source_evidence="Algorithms are expressed as ordered networks of gates and measurements."),
    Concept(id="noise_decoherence", name="Noise and Decoherence", description="Physical error sources and loss of quantum information.", difficulty=4, estimated_minutes=90, category=ConceptCategory.ADVANCED, source_evidence="Real quantum hardware is affected by noise and decoherence."),
    Concept(id="grovers_algorithm", name="Grover's Algorithm", description="Amplitude amplification for unstructured search.", difficulty=4, estimated_minutes=120, category=ConceptCategory.ADVANCED, source_evidence="Grover search demonstrates a quadratic quantum speedup."),
    Concept(id="shors_algorithm", name="Shor's Algorithm", description="Period finding and integer factorization.", difficulty=5, estimated_minutes=180, category=ConceptCategory.ADVANCED, source_evidence="Shor's algorithm combines quantum period finding with classical post-processing."),
    Concept(id="error_correction", name="Quantum Error Correction", description="Logical qubits, syndromes, and fault-tolerant encoding.", difficulty=5, estimated_minutes=180, category=ConceptCategory.ADVANCED, source_evidence="Error correction protects quantum information without copying unknown states."),
    Concept(id="quantum_applications", name="Quantum Applications", description="Where quantum algorithms may offer practical value.", difficulty=4, estimated_minutes=120, category=ConceptCategory.APPLICATION, source_evidence="Search, cryptography, simulation, and optimization motivate quantum computing."),
]


QUANTUM_DEPENDENCIES = [
    Dependency(concept_id="tensor_products", prerequisites=["linear_algebra", "complex_numbers"]),
    Dependency(concept_id="quantum_states", prerequisites=["linear_algebra", "complex_numbers", "probability"]),
    Dependency(concept_id="qubits", prerequisites=["quantum_states"]),
    Dependency(concept_id="quantum_measurement", prerequisites=["quantum_states", "probability"]),
    Dependency(concept_id="quantum_gates", prerequisites=["qubits", "linear_algebra"]),
    Dependency(concept_id="entanglement", prerequisites=["qubits", "tensor_products"]),
    Dependency(concept_id="quantum_circuits", prerequisites=["quantum_gates", "quantum_measurement"]),
    Dependency(concept_id="noise_decoherence", prerequisites=["quantum_measurement", "entanglement"]),
    Dependency(concept_id="grovers_algorithm", prerequisites=["quantum_circuits", "probability"]),
    Dependency(concept_id="shors_algorithm", prerequisites=["quantum_circuits", "classical_computation", "tensor_products"]),
    Dependency(concept_id="error_correction", prerequisites=["quantum_circuits", "noise_decoherence", "entanglement"]),
    Dependency(concept_id="quantum_applications", prerequisites=["grovers_algorithm", "shors_algorithm", "error_correction"]),
]

