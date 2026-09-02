import assert from 'node:assert/strict'
import { generateMapLayout, placeMapLabels } from '../src/mapLayout.ts'

const template = {
  code: 'T6', name: 'Test', use: 'test', logic: 'test',
  lines: [
    { name: 'Upper', color: '#0ff', path: 'M0 0H100L150 50H200' },
    { name: 'Lower', color: '#f0f', path: 'M0 100H100L150 50H200' },
  ],
  stations: [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 },
    { x: 150, y: 50, role: 'interchange' }, { x: 200, y: 50, role: 'goal' },
  ],
}
const concepts = ['a', 'b', 'c', 'd', 'goal'].map(id => ({ id }))
const lines = [{ id: 'upper', concept_ids: ['a', 'b'] }, { id: 'lower', concept_ids: ['c', 'd', 'goal'] }]
const layout = generateMapLayout([template], concepts, lines, 'goal')

assert.equal(layout.points.size, concepts.length)
assert.equal(layout.points.get('goal').x, 215)
assert.deepEqual([...layout.linePaths.keys()].sort(), ['lower', 'upper'])
assert.ok(layout.linePaths.get('upper').includes('200'), 'Template lines must stay connected through their shared station.')
assert.equal(new Set([...layout.points.values()].map(point => `${point.x}:${point.y}`)).size, concepts.length)
const labels = placeMapLabels(concepts.map(concept => ({ id: concept.id, point: layout.points.get(concept.id), lines: [`Long ${concept.id} label`] })), 960, 600)
for (const [id, label] of labels) for (const [otherId, other] of labels) if (id < otherId) assert.ok(label.x + label.width + 5 <= other.x || other.x + other.width + 5 <= label.x || label.y + label.height + 5 <= other.y || other.y + other.height + 5 <= label.y, `${id} and ${otherId} labels overlap.`)
console.log('Map layout check passed.')
