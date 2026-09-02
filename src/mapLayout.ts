import type { MapTemplate } from './MapsGallery'

type Concept = { id: string }
type LearningLine = { id: string; concept_ids: string[] }
export type LayoutPoint = { x: number; y: number; interchange?: boolean }
export type MapLabel = { id: string; point: LayoutPoint; lines: string[]; priority?: number; role?: 'today' | 'goal' }
export type LabelPlacement = { x: number; y: number; width: number; height: number; leaderX: number; leaderY: number }

const scaleStation = (station: MapTemplate['stations'][number]): LayoutPoint => ({
  x: 35 + station.x * .9,
  y: 45 + station.y * .92,
  interchange: station.role === 'interchange',
})

// ponytail: /maps paths use absolute M/L/H/V commands; extend this only if a template introduces curves.
function pathVertices(path: string) {
  const tokens = path.match(/[MLHV]|-?\d+(?:\.\d+)?/g) ?? []
  const points: { x: number; y: number }[] = []
  let x = 0
  let y = 0
  for (let index = 0; index < tokens.length;) {
    const command = tokens[index++]
    if (command === 'M' || command === 'L') {
      x = Number(tokens[index++])
      y = Number(tokens[index++])
    } else if (command === 'H') x = Number(tokens[index++])
    else if (command === 'V') y = Number(tokens[index++])
    points.push({ x, y })
  }
  return points
}

function pointOnPath(point: { x: number; y: number }, vertices: { x: number; y: number }[]) {
  let offset = 0
  let best = { distance: Number.POSITIVE_INFINITY, progress: 0 }
  for (let index = 1; index < vertices.length; index += 1) {
    const from = vertices[index - 1]
    const to = vertices[index]
    const dx = to.x - from.x
    const dy = to.y - from.y
    const lengthSquared = dx * dx + dy * dy
    const length = Math.sqrt(lengthSquared)
    const position = lengthSquared ? Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared)) : 0
    const distance = Math.hypot(point.x - (from.x + dx * position), point.y - (from.y + dy * position))
    if (distance < best.distance) best = { distance, progress: offset + length * position }
    offset += length
  }
  return best
}

function templateTracks(template: MapTemplate) {
  return template.lines.map(line => {
    const vertices = pathVertices(line.path)
    const stations = template.stations
      .map((station, index) => ({ index, ...pointOnPath(station, vertices) }))
      .filter(station => station.distance < 1)
      .sort((left, right) => left.progress - right.progress)
    return { path: line.path, vertices, stationIndexes: stations.map(station => station.index) }
  })
}

function selectTemplate(templates: readonly MapTemplate[], conceptCount: number, lines: LearningLine[]) {
  const candidates = templates.filter(template => template.stations.length >= conceptCount)
  const pool = candidates.length ? candidates : templates.filter(template => template.stations.length === Math.max(...templates.map(item => item.stations.length)))
  const needs = lines.map(line => line.concept_ids.length).sort((left, right) => right - left)
  return [...pool].sort((left, right) => {
    const score = (template: MapTemplate) => {
      const capacities = templateTracks(template).map(track => track.stationIndexes.length).sort((a, b) => b - a)
      const fit = needs.reduce((total, need, index) => total + Math.abs(need - (capacities[index] ?? 0)) * 4 + Math.max(0, need - (capacities[index] ?? 0)) * 100, 0)
      return Math.abs(template.lines.length - lines.length) * 1000 + (template.stations.length - conceptCount) * 2 + fit
    }
    return score(left) - score(right)
  })[0]
}

const takeEvenly = (values: number[], count: number) => {
  if (count >= values.length) return values
  if (count === 1) return [values[Math.floor(values.length / 2)]]
  return Array.from({ length: count }, (_, index) => values[Math.round(index * (values.length - 1) / (count - 1))])
}

export function generateMapLayout(templates: readonly MapTemplate[], concepts: Concept[], lines: LearningLine[], goalId?: string) {
  const template = selectTemplate(templates, concepts.length, lines)
  const tracks = templateTracks(template)
  const goalStationIndex = template.stations.findIndex(station => station.role === 'goal')
  const availableTracks = new Set(tracks.map((_, index) => index))
  const trackByLine = new Map<number, number>()
  const goalLineIndex = lines.findIndex(line => line.concept_ids.includes(goalId ?? ''))

  const assignTrack = (lineIndex: number, candidates = [...availableTracks]) => {
    const need = lines[lineIndex].concept_ids.length
    const trackIndex = candidates.sort((left, right) => {
      const leftCapacity = tracks[left].stationIndexes.length
      const rightCapacity = tracks[right].stationIndexes.length
      return Math.max(0, need - leftCapacity) * 100 + Math.abs(need - leftCapacity) - (Math.max(0, need - rightCapacity) * 100 + Math.abs(need - rightCapacity))
    })[0]
    if (trackIndex === undefined) return
    trackByLine.set(lineIndex, trackIndex)
    availableTracks.delete(trackIndex)
  }

  if (goalLineIndex >= 0) assignTrack(goalLineIndex, [...availableTracks].filter(index => tracks[index].stationIndexes.includes(goalStationIndex)))
  lines.map((line, index) => ({ index, size: line.concept_ids.length })).filter(item => item.index !== goalLineIndex).sort((left, right) => right.size - left.size).forEach(item => assignTrack(item.index))

  const conceptIds = new Set(concepts.map(concept => concept.id))
  const assignedConcepts = new Set<string>()
  const usedStations = new Set<number>()
  const points = new Map<string, LayoutPoint>()
  const linePaths = new Map<string, string>()
  const assignmentOrder = [...trackByLine].sort(([left], [right]) => left === goalLineIndex ? -1 : right === goalLineIndex ? 1 : lines[right].concept_ids.length - lines[left].concept_ids.length)

  for (const [lineIndex, trackIndex] of assignmentOrder) {
    const line = lines[lineIndex]
    const track = tracks[trackIndex]
    const members = line.concept_ids.filter(id => conceptIds.has(id) && !assignedConcepts.has(id))
    const hasGoal = !!goalId && members.includes(goalId)
    const regularMembers = members.filter(id => id !== goalId)
    const onTrack = track.stationIndexes.filter(index => index !== goalStationIndex && !usedStations.has(index))
    const chosen = takeEvenly(onTrack, Math.min(regularMembers.length, onTrack.length))
    const overflow = regularMembers.length - chosen.length
    if (overflow > 0) {
      const nearby = template.stations.map((station, index) => ({ index, distance: pointOnPath(station, track.vertices).distance }))
        .filter(station => station.index !== goalStationIndex && !usedStations.has(station.index) && !chosen.includes(station.index))
        .sort((left, right) => left.distance - right.distance)
      chosen.push(...nearby.slice(0, overflow).map(station => station.index))
    }
    regularMembers.forEach((id, index) => {
      const stationIndex = chosen[index]
      if (stationIndex === undefined) return
      points.set(id, scaleStation(template.stations[stationIndex]))
      assignedConcepts.add(id)
      usedStations.add(stationIndex)
    })
    if (hasGoal && goalStationIndex >= 0) {
      points.set(goalId, scaleStation(template.stations[goalStationIndex]))
      assignedConcepts.add(goalId)
      usedStations.add(goalStationIndex)
    }
    if (overflow <= 0) linePaths.set(line.id, track.path)
  }

  if (goalId && conceptIds.has(goalId) && !assignedConcepts.has(goalId) && goalStationIndex >= 0) {
    points.set(goalId, scaleStation(template.stations[goalStationIndex]))
    assignedConcepts.add(goalId)
    usedStations.add(goalStationIndex)
  }

  const unusedStations = template.stations.map((_, index) => index).filter(index => !usedStations.has(index))
  const remaining = concepts.filter(concept => !assignedConcepts.has(concept.id))
  remaining.forEach((concept, index) => {
    const stationIndex = unusedStations[index]
    points.set(concept.id, stationIndex === undefined
      ? { x: 80 + index % 9 * 95, y: 530 + Math.floor(index / 9) * 70 }
      : scaleStation(template.stations[stationIndex]))
  })

  return { template, points, linePaths, height: Math.max(600, 580 + Math.floor(Math.max(0, remaining.length - unusedStations.length - 1) / 9) * 70) }
}

export function placeMapLabels(labels: MapLabel[], width = 960, height = 600, charWidth = 6, lineHeight = 13) {
  const margin = 5
  const overlaps = (left: { x: number; y: number; width: number; height: number }, right: { x: number; y: number; width: number; height: number }) => left.x < right.x + right.width + margin && left.x + left.width + margin > right.x && left.y < right.y + right.height + margin && left.y + left.height + margin > right.y
  const occupied = labels.flatMap(label => [
    { x: label.point.x - 15, y: label.point.y - 15, width: 30, height: 30 },
    ...(label.role === 'today' ? [{ x: label.point.x - 32, y: label.point.y - 45, width: 64, height: 23 }] : []),
    ...(label.role === 'goal' ? [{ x: label.point.x + 18, y: label.point.y - 25, width: 70, height: 20 }] : []),
  ])
  const placements = new Map<string, LabelPlacement>()

  for (const label of [...labels].sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))) {
    const labelWidth = Math.max(...label.lines.map(line => line.length), 1) * charWidth + 12
    const labelHeight = label.lines.length * lineHeight + 8
    const { x, y } = label.point
    const candidates = [
      { x: x + 20, y: y - labelHeight / 2 }, { x: x - labelWidth - 20, y: y - labelHeight / 2 },
      { x: x - labelWidth / 2, y: y - labelHeight - 22 }, { x: x - labelWidth / 2, y: y + 22 },
      { x: x + 18, y: y - labelHeight - 18 }, { x: x - labelWidth - 18, y: y - labelHeight - 18 },
      { x: x + 18, y: y + 18 }, { x: x - labelWidth - 18, y: y + 18 },
    ]
    let box = candidates.find(candidate => candidate.x >= margin && candidate.y >= margin && candidate.x + labelWidth <= width - margin && candidate.y + labelHeight <= height - margin && !occupied.some(item => overlaps({ ...candidate, width: labelWidth, height: labelHeight }, item)))
    if (!box) {
      const free: { x: number; y: number; distance: number }[] = []
      for (let top = margin; top <= height - labelHeight - margin; top += 8) for (let left = margin; left <= width - labelWidth - margin; left += 8) {
        const candidate = { x: left, y: top, width: labelWidth, height: labelHeight }
        if (!occupied.some(item => overlaps(candidate, item))) free.push({ x: left, y: top, distance: Math.hypot(left + labelWidth / 2 - x, top + labelHeight / 2 - y) })
      }
      box = free.sort((left, right) => left.distance - right.distance)[0] ?? { x: Math.max(margin, Math.min(width - labelWidth - margin, x + 20)), y: Math.max(margin, Math.min(height - labelHeight - margin, y + 20)) }
    }
    const placement = { ...box, width: labelWidth, height: labelHeight, leaderX: Math.max(box.x, Math.min(box.x + labelWidth, x)), leaderY: Math.max(box.y, Math.min(box.y + labelHeight, y)) }
    placements.set(label.id, placement)
    occupied.push(placement)
  }
  return placements
}
