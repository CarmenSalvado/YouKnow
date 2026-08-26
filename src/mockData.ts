export const navigation = ['Learning Map', 'Study Plan', 'Library', 'Progress', 'AI Coach', 'Settings']

export const week = [
  { day: 'SUN', date: 18 },
  { day: 'MON', date: 19 },
  { day: 'TUE', date: 20 },
  { day: 'WED', date: 21, current: true },
  { day: 'THU', date: 22 },
  { day: 'FRI', date: 23 },
  { day: 'SAT', date: 24 },
]

export type RouteName = 'blue' | 'green' | 'purple' | 'orange'

export type Station = {
  x: number
  y: number
  label: string
  route: RouteName
  lines?: string[]
  labelX?: number
  labelY?: number
  interchange?: boolean
  current?: boolean
}

export const stations: Station[] = [
  { x: 55, y: 48, label: 'Linear Algebra Basics', lines: ['Linear Algebra', 'Basics'], route: 'blue' },
  { x: 69, y: 104, label: 'Complex Numbers', lines: ['Complex', 'Numbers'], route: 'blue' },
  { x: 103, y: 171, label: 'Matrices & Vectors', lines: ['Matrices &', 'Vectors'], route: 'blue' },
  { x: 200, y: 245, label: 'Calculus Refresher', lines: ['Calculus', 'Refresher'], route: 'blue' },
  { x: 245, y: 116, label: 'Probability Theory', lines: ['Probability', 'Theory'], route: 'purple' },
  { x: 266, y: 167, label: 'Statistics Essentials', lines: ['Statistics', 'Essentials'], route: 'purple' },
  { x: 362, y: 234, label: 'Quantum Mechanics Fundamentals', lines: ['Quantum', 'Mechanics', 'Fundamentals'], route: 'green', interchange: true, labelX: 388, labelY: 245 },
  { x: 420, y: 68, label: 'Dirac Notation', route: 'green' },
  { x: 420, y: 132, label: 'Operators & Observables', lines: ['Operators &', 'Observables'], route: 'green' },
  { x: 585, y: 76, label: 'Hilbert Spaces', route: 'green' },
  { x: 525, y: 232, label: 'Qubits', route: 'green', labelX: 506, labelY: 215 },
  { x: 608, y: 234, label: 'Quantum Circuits', lines: ['Quantum', 'Circuits'], route: 'green' },
  { x: 724, y: 234, label: 'Measurement & Collapse', lines: ['Measurement &', 'Collapse'], route: 'green' },
  { x: 437, y: 335, label: 'Quantum Information', lines: ['Quantum', 'Information'], route: 'purple' },
  { x: 496, y: 399, label: 'Entanglement & Superposition', lines: ['Entanglement', '& Superposition'], route: 'purple' },
  { x: 496, y: 485, label: 'Quantum Teleportation', lines: ['Quantum', 'Teleportation'], route: 'purple' },
  { x: 608, y: 326, label: 'Quantum Algorithms', lines: ['Quantum', 'Algorithms'], route: 'purple', current: true, labelX: 641, labelY: 342 },
  { x: 838, y: 289, label: 'Error Correction & Decoherence', lines: ['Error Correction', '& Decoherence'], route: 'purple' },
  { x: 873, y: 393, label: 'Quantum Complexity', lines: ['Quantum', 'Complexity'], route: 'purple' },
  { x: 238, y: 342, label: 'Python for Quantum Computing', lines: ['Python for', 'Quantum', 'Computing'], route: 'orange' },
  { x: 145, y: 408, label: 'Classical Computing Basics', lines: ['Classical', 'Computing', 'Basics'], route: 'orange' },
  { x: 279, y: 461, label: 'Algorithms & Data Structures', lines: ['Algorithms &', 'Data Structures'], route: 'orange' },
  { x: 765, y: 423, label: 'Fault-Tolerant Quantum Computing', lines: ['Fault-Tolerant', 'Quantum', 'Computing'], route: 'orange' },
  { x: 795, y: 500, label: 'Quantum Advantage', lines: ['Quantum', 'Advantage'], route: 'orange' },
  { x: 814, y: 560, label: 'Real-World Applications', lines: ['Real-World', 'Applications'], route: 'orange' },
]
