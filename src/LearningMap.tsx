import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { BookOpen, Check, Crosshair, GitBranch, Maximize2, Minimize2, Minus, Pencil, Play, Plus, RotateCcw, WandSparkles, X } from 'lucide-react'
import { mapTemplates } from './MapsGallery'
import { generateMapLayout, placeMapLabels, type LayoutPoint } from './mapLayout'
import { stations, type RouteName, type Station } from './mockData'

const colors: Record<RouteName, string> = {
  blue: '#2ec5ff',
  green: '#22d98b',
  purple: '#b678ff',
  orange: '#ffbd32',
}

type LearningConcept = { id: string; name: string; description: string; estimated_minutes: number; category: 'foundation' | 'core' | 'advanced' | 'application'; level: number }
type LearningEdge = { from: string; to: string }
type LearningLine = { id: string; name: string; description: string; concept_ids: string[] }
const categoryColors = { foundation: colors.blue, core: colors.green, advanced: colors.purple, application: colors.orange }
const linePalette = ['#2ec5ff', '#22d98b', '#b678ff', '#ffbd32', '#ff6384', '#ff7c4d', '#f7f9ff', '#19d7cf']
const routeCategories = { blue: 'foundation', green: 'core', purple: 'advanced', orange: 'application' } as const
const categoryLabels = { foundation: 'Foundation', core: 'Core concept', advanced: 'Advanced', application: 'Application' }
const routeLegendLabels = { blue: 'Foundations', green: 'Core concepts', purple: 'Advanced topics', orange: 'Applications' } as const
const presetConcepts: LearningConcept[] = stations.map(station => ({
  id: station.label,
  name: station.label,
  description: `Understand ${station.label} and how it connects to the wider Quantum Computing path.`,
  estimated_minutes: 30,
  category: routeCategories[station.route],
  level: 0,
}))
const presetEdges: LearningEdge[] = stations.flatMap((station, index) => {
  const previous = stations.slice(0, index).reverse().find(candidate => candidate.route === station.route)
  return previous ? [{ from: previous.label, to: station.label }] : []
})

function collectPrerequisites(conceptId: string | undefined, edges: LearningEdge[]) {
  const required = new Set<string>()
  if (!conceptId) return required
  const pending = [conceptId]
  // ponytail: plans are capped at 25 nodes; index incoming edges if that ceiling grows.
  while (pending.length) {
    const target = pending.pop()!
    edges.forEach(edge => {
      if (edge.to === target && !required.has(edge.from)) {
        required.add(edge.from)
        pending.push(edge.from)
      }
    })
  }
  return required
}

const mapY = (value: number) => value
const stretchPoints = (points: string) => points
  .split(' ')
  .map(point => {
    const [x, y] = point.split(',').map(Number)
    return `${x},${mapY(y)}`
  })
  .join(' ')
const motionPath = (points: string) => `M ${points.split(' ').join(' L ')}`
const metroSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dy) < 2) return `H ${to.x}`
  if (Math.abs(dx) < 40) return `V ${to.y} H ${to.x}`
  const midX = from.x + dx / 2
  const xDirection = Math.sign(dx) || 1
  const yDirection = Math.sign(dy)
  const radius = Math.min(18, Math.abs(dx) / 4, Math.abs(dy) / 2)
  return `H ${midX - xDirection * radius} Q ${midX} ${from.y} ${midX} ${from.y + yDirection * radius} V ${to.y - yDirection * radius} Q ${midX} ${to.y} ${midX + xDirection * radius} ${to.y} H ${to.x}`
}
const metroPath = (points: { x: number; y: number }[]) => points.length ? points.slice(1).reduce((path, point, index) => `${path} ${metroSegment(points[index], point)}`, `M ${points[0].x} ${points[0].y}`) : ''
const lineLabel = (label: string) => label.replace(/\s+(?:field\s+)?line$/i, '')
const stationLabel = (label: string) => {
  if (label.length <= 16) return [label]
  const words = label.split(' ')
  const lines = words.reduce<string[]>((result, word) => {
    const last = result[result.length - 1]
    if (!last || `${last} ${word}`.length > 16) result.push(word)
    else result[result.length - 1] = `${last} ${word}`
    return result
  }, [])
  return lines.length <= 2 ? lines : [lines[0], `${lines.slice(1).join(' ').slice(0, 14)}…`]
}

const routes: { route: RouteName; points: string }[] = [
  { route: 'blue', points: '55,48 60,84 69,104 82,145 103,171 153,224 200,245 239,267 307,267 362,234' },
  { route: 'purple', points: '245,116 250,143 266,167 289,205 333,205 362,234 371,283 437,335 496,399 552,399 608,326 793,326 838,289 873,328 873,393 925,446' },
  { route: 'purple', points: '496,399 496,485' },
  { route: 'green', points: '362,234 420,188 420,68 585,76 640,126 640,171 608,199 608,234 724,234 771,269 804,269 838,289' },
  { route: 'green', points: '420,188 465,232 525,232 608,234' },
  { route: 'orange', points: '362,234 306,290 238,342 190,374 145,408 145,461 279,461 330,512' },
  { route: 'orange', points: '608,326 678,347 729,366 765,423 765,454 795,500 795,536 814,560' },
]

function MetroStation({ station, point, color, goal, selected, required, related, completed, known, editing, onSelect, onStart, onDragStart, onNudge }: { station: Station; point: LayoutPoint; color: string; goal: boolean; selected: boolean; required: boolean; related: boolean; completed: boolean; known: boolean; editing: boolean; onSelect: (event?: ReactMouseEvent<SVGGElement>) => void; onStart: () => void; onDragStart: (event: ReactPointerEvent<SVGGElement>) => void; onNudge: (x: number, y: number) => void }) {
  const { interchange, current } = station
  const { x, y } = point
  const labelX = (station.labelX ?? station.x + 19) + x - station.x
  const labelY = (station.labelY ?? station.y + 4) + y - station.y
  const lines = station.lines ?? [station.label]

  return (
    <g
      className={`metro-station interactive-station ${current ? 'current-station' : ''} ${selected ? 'selected-station' : ''} ${required ? 'required-station' : ''} ${completed ? 'completed-station' : ''} ${known ? 'known-station' : ''} ${related ? '' : 'dimmed-station'}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={editing ? `${station.label}. Drag or use arrow keys to move.` : `${station.label}. Select station; double click to start.`}
      onPointerDown={onDragStart}
      onClick={editing ? undefined : onSelect}
      onDoubleClick={editing ? undefined : onStart}
      onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
        if (editing && event.key.startsWith('Arrow')) {
          event.preventDefault()
          const step = event.shiftKey ? 1 : 10
          onNudge(event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0, event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0)
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <circle className="station-hit" cx={x} cy={y} r="25" />
      {selected && <circle className="station-selection" cx={x} cy={y} r="22" />}
      {selected && <g className="station-spark" aria-hidden="true"><path d={`M ${x - 27} ${y}h-8M ${x + 27} ${y}h8M ${x} ${y - 27}v-8M ${x} ${y + 27}v8M ${x - 19} ${y - 19}l-6 -6M ${x + 19} ${y - 19}l6 -6M ${x - 19} ${y + 19}l-6 6M ${x + 19} ${y + 19}l6 6`} /></g>}
      {current && (
        <>
          <circle className="station-current" cx={x} cy={y} r="24" fill="#071423" stroke="#f7fbff" strokeWidth="3" />
          <circle cx={x} cy={y} r="20" fill="none" stroke="var(--contrast)" strokeWidth="4" />
          <circle cx={x} cy={y} r="10" fill="#f7fbff" />
          <g className="map-today-marker" transform={`translate(${x + 30} ${y - 31})`}>
            <rect width="53" height="23" rx="4" fill="#1668f5" />
            <text x="26.5" y="15.5" textAnchor="middle" className="today-label">TODAY</text>
          </g>
        </>
      )}
      {!current && (
        <>
          {interchange && <circle cx={x} cy={y} r="17" fill="#0a1726" stroke="#dfe9f7" strokeWidth="3" />}
          <circle cx={x} cy={y} r={interchange ? 8 : 9} fill="#091523" stroke={color} strokeWidth="4" />
          <circle cx={x} cy={y} r={interchange ? 4.5 : 4} fill="#e8eef7" />
        </>
      )}
      {goal && <g className="map-goal-marker"><circle cx={x} cy={y} r="17" /><text x={x + 24} y={y - 12}>END GOAL</text></g>}
      {(completed || known) && <path className="station-check" d="M-4 0l3 3 6-7" transform={`translate(${x} ${y})`} />}
      <text x={labelX} y={labelY} className={current ? 'station-label current-label' : 'station-label'}>
        {lines.map((line, index) => <tspan x={labelX} dy={index ? 16 : 0} key={line}>{line}</tspan>)}
      </text>
    </g>
  )
}

export default function LearningMap({ title = 'Quantum Computing', concepts, edges = [], lines = [], currentConceptId, goalConceptId, todayConceptId, completedConceptIds = [], knownConceptIds = [], nodeLabelStyle = 'smart', empty = false, canGenerate = false, generating = false, onGenerate, onStartConcept, onExpandConcept, onOpenNotebook, onToggleKnown, onRequestRequiredPath }: {
  title?: string
  concepts?: LearningConcept[]
  edges?: LearningEdge[]
  lines?: LearningLine[]
  currentConceptId?: string
  goalConceptId?: string
  todayConceptId?: string
  completedConceptIds?: string[]
  knownConceptIds?: string[]
  nodeLabelStyle?: 'smart' | 'metro'
  empty?: boolean
  canGenerate?: boolean
  generating?: boolean
  onGenerate?: () => void
  onStartConcept?: (conceptId: string) => void
  onExpandConcept?: (conceptId: string, conceptName: string) => void
  onOpenNotebook?: (conceptId: string) => void
  onToggleKnown?: (conceptId: string) => void
  onRequestRequiredPath?: (conceptId: string, conceptName: string) => Promise<string[]>
}) {
  const card = useRef<HTMLElement>(null)
  const viewport = useRef<SVGGElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [lineColors, setLineColors] = useState<Record<string, string>>({})
  const [panning, setPanning] = useState(false)
  const panDrag = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean }>()
  const nodeDrag = useRef<{ pointerId: number; id: string; offsetX: number; offsetY: number; interchange?: boolean; moved: boolean }>()
  const suppressStationClick = useRef(false)
  const [editing, setEditing] = useState(false)
  const [nodePositions, setNodePositions] = useState<Record<string, LayoutPoint>>({})
  const [fullscreen, setFullscreen] = useState(false)
  const [clickBurst, setClickBurst] = useState<{ x: number; y: number; id: number }>()
  const [selectedId, setSelectedId] = useState(currentConceptId)
  const [requiredPathIds, setRequiredPathIds] = useState<string[] | null>(null)
  const [requiredPathLoading, setRequiredPathLoading] = useState(false)
  const generated = !!concepts?.length
  const allConcepts = generated ? concepts : presetConcepts
  const relationshipEdges = generated ? edges : presetEdges
  const todayId = todayConceptId ?? currentConceptId
  const goalId = goalConceptId ?? (generated ? concepts?.[concepts.length - 1]?.id : stations[stations.length - 1]?.label)
  const labelForId = (id: string | undefined) => allConcepts?.find(concept => concept.id === id)?.name
  const selected = allConcepts?.find(concept => concept.id === selectedId)
  const prerequisiteIds = useMemo(() => collectPrerequisites(selectedId, relationshipEdges), [relationshipEdges, selectedId])
  const directPrerequisites = allConcepts?.filter(concept => relationshipEdges.some(edge => edge.from === concept.id && edge.to === selectedId)) ?? []
  const unlockedConcepts = allConcepts?.filter(concept => relationshipEdges.some(edge => edge.from === selectedId && edge.to === concept.id)) ?? []
  const completed = useMemo(() => new Set(completedConceptIds), [completedConceptIds])
  const known = useMemo(() => new Set(knownConceptIds), [knownConceptIds])
  const lineByConcept = useMemo(() => new Map(lines.flatMap((line, index) => line.concept_ids.map(id => [id, { ...line, color: lineColors[line.id] ?? linePalette[index % linePalette.length], index }] as const))), [lineColors, lines])
  const routeColor = (route: RouteName) => lineColors[route] ?? colors[route]
  const stationColor = (concept: LearningConcept) => lineByConcept.get(concept.id)?.color ?? categoryColors[concept.category]
  const visibleConcepts = requiredPathIds && selectedId
    ? concepts?.filter(concept => requiredPathIds.includes(concept.id))
    : concepts
  const visibleIds = useMemo(() => new Set(visibleConcepts?.map(concept => concept.id)), [visibleConcepts])
  const premadeLayout = useMemo(() => {
    if (!concepts?.length) return { points: new Map<string, LayoutPoint>(), linePaths: new Map<string, string>(), height: 600 }
    return generateMapLayout(mapTemplates, concepts, lines, goalId)
  }, [concepts, goalId, lines])
  const layout = useMemo(() => {
    const next = new Map(premadeLayout.points)
    Object.entries(nodePositions).forEach(([id, point]) => next.set(id, point))
    return next
  }, [nodePositions, premadeLayout.points])
  const mapHeight = premadeLayout.height
  const labelLayout = useMemo(() => placeMapLabels((visibleConcepts ?? []).map(concept => ({
    id: concept.id,
    point: layout.get(concept.id)!,
    lines: stationLabel(concept.name),
    priority: concept.id === todayId ? 2 : concept.id === goalId ? 1 : 0,
    role: concept.id === todayId ? 'today' as const : concept.id === goalId ? 'goal' as const : undefined,
  })), 960, mapHeight, nodeLabelStyle === 'metro' ? 7 : 6, nodeLabelStyle === 'metro' ? 14 : 13), [goalId, layout, mapHeight, nodeLabelStyle, todayId, visibleConcepts])
  const lineTracks = useMemo(() => lines.map((line, index) => {
    const points = line.concept_ids.filter(id => visibleIds.has(id)).map(id => layout.get(id)).filter((point): point is LayoutPoint => !!point)
    const templatePath = requiredPathIds || line.concept_ids.some(id => nodePositions[id]) ? undefined : premadeLayout.linePaths.get(line.id)
    return { ...line, points, path: templatePath ?? metroPath(points), templatePath: !!templatePath, color: lineColors[line.id] ?? linePalette[index % linePalette.length] }
  }).filter(line => line.points.length > 1), [layout, lineColors, lines, nodePositions, premadeLayout.linePaths, requiredPathIds, visibleIds])

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === card.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  useEffect(() => {
    setSelectedId(currentConceptId)
    setRequiredPathIds(null)
  }, [concepts, currentConceptId])

  useEffect(() => {
    setEditing(false)
    setNodePositions({})
  }, [concepts, title])

  const changeZoom = (amount: number) => setZoom(value => Math.min(1.5, Math.max(.75, value + amount)))
  const clampPan = (value: { x: number; y: number }, scale: number) => {
    const maxX = Math.max(0, (scale - 1) * 480)
    const maxY = Math.max(0, (scale - 1) * 300)
    return { x: Math.max(-maxX, Math.min(maxX, value.x)), y: Math.max(-maxY, Math.min(maxY, value.y)) }
  }
  useEffect(() => setPan(value => clampPan(value, zoom)), [zoom])
  const startPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    if ((event.target as Element).closest('[role="button"]')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    panDrag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y, moved: false }
    setPanning(true)
  }
  const mapPoint = (event: ReactPointerEvent) => {
    const matrix = viewport.current?.getScreenCTM()?.inverse()
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix) : { x: event.clientX, y: event.clientY }
  }
  const startNodeDrag = (id: string, point: LayoutPoint, event: ReactPointerEvent<SVGGElement>) => {
    if (!editing || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const cursor = mapPoint(event)
    nodeDrag.current = { pointerId: event.pointerId, id, offsetX: cursor.x - point.x, offsetY: cursor.y - point.y, interchange: point.interchange, moved: false }
  }
  const moveNode = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = nodeDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return false
    const cursor = mapPoint(event)
    const point = { x: Math.max(24, Math.min(936, cursor.x - drag.offsetX)), y: Math.max(24, Math.min(mapHeight - 24, cursor.y - drag.offsetY)), interchange: drag.interchange }
    drag.moved = true
    setNodePositions(value => ({ ...value, [drag.id]: point }))
    return true
  }
  const nudgeNode = (id: string, point: LayoutPoint, dx: number, dy: number) => setNodePositions(value => ({ ...value, [id]: { ...point, x: Math.max(24, Math.min(936, point.x + dx)), y: Math.max(24, Math.min(mapHeight - 24, point.y + dy)) } }))
  const movePan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (moveNode(event)) return
    const drag = panDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const rect = event.currentTarget.getBoundingClientRect()
    const dx = (event.clientX - drag.startX) * 960 / rect.width
    const dy = (event.clientY - drag.startY) * 600 / rect.height
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
    setPan(clampPan({ x: drag.originX + dx, y: drag.originY + dy }, zoom))
  }
  const endPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (nodeDrag.current?.pointerId === event.pointerId) {
      suppressStationClick.current = nodeDrag.current.moved
      nodeDrag.current = undefined
      return
    }
    const drag = panDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.moved) suppressStationClick.current = true
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    panDrag.current = undefined
    setPanning(false)
  }
  const toggleFullscreen = () => {
    const action = document.fullscreenElement ? document.exitFullscreen() : card.current?.requestFullscreen()
    action?.catch(() => undefined)
  }
  const selectConcept = (conceptId: string, event?: ReactMouseEvent<SVGGElement>) => {
    setSelectedId(conceptId)
    setRequiredPathIds(null)
    if (!event || !card.current) return
    const rect = card.current.getBoundingClientRect()
    const id = Date.now()
    setClickBurst({ x: event.clientX - rect.left, y: event.clientY - rect.top, id })
    window.setTimeout(() => setClickBurst(value => value?.id === id ? undefined : value), 900)
  }
  const closeInspector = () => {
    setSelectedId(undefined)
    setRequiredPathIds(null)
  }
  const requestRequiredPath = async () => {
    if (!selectedId || !selected) return
    setRequiredPathLoading(true)
    try {
      const ids = onRequestRequiredPath
        ? await onRequestRequiredPath(selected.id, selected.name)
        : [selected.id, ...prerequisiteIds]
      setRequiredPathIds([...new Set(ids)])
    } catch {
      setRequiredPathIds([selected.id, ...prerequisiteIds])
    } finally {
      setRequiredPathLoading(false)
    }
  }
  const handleEmptyAction = () => {
    if (canGenerate) return onGenerate?.()
    const source = document.querySelector<HTMLInputElement>('[aria-label="Learning source content"], [aria-label="PDF source"]')
    source?.focus()
    if (source?.type === 'file') source.click()
  }

  return (
    <section ref={card} className="map-card min-h-0 overflow-hidden rounded-[10px] border border-line bg-panel" aria-label="Learning map">
      <header className="map-heading flex items-center justify-between border-b border-[#1b293a] px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.13em] text-muted">Learning map</p>
          <h1 className="mt-0.5 text-[17px] font-semibold text-[#f0f4fa]" title={selected?.description}>{selected?.name ?? title}</h1>
          <p className="map-route-position"><span className="is-today"><i />Today: {labelForId(todayId) ?? 'Not started'}</span><span className="is-goal"><i />End goal: {title || labelForId(goalId) || 'Choose a topic'}</span></p>
        </div>
        <div className="legend flex items-center gap-5 text-[11px] text-[#a6b0bf]">
            {generated && lines.length ? lines.map((line, index) => {
              const color = lineColors[line.id] ?? linePalette[index % linePalette.length]
              return <span key={line.id} title={`${line.name}: ${line.description}`}><i style={{ background: color }} /><input className="legend-color" type="color" aria-label={'Change ' + line.name + ' color'} value={color} onChange={event => setLineColors(value => ({ ...value, [line.id]: event.target.value }))} />{lineLabel(line.name)}</span>
            }) : <>
            {(['blue', 'green', 'purple', 'orange'] as const).map(route => <span key={route}><i style={{ background: routeColor(route) }} /><input className="legend-color" type="color" aria-label={'Change ' + routeLegendLabels[route] + ' color'} value={routeColor(route)} onChange={event => setLineColors(value => ({ ...value, [route]: event.target.value }))} />{routeLegendLabels[route]}</span>)}
          </>}
        </div>
      </header>

      <div className="relative min-h-0">
        {empty && !concepts?.length && <div className="empty-map"><div className="empty-map-line"><i /><i /><i /><i /></div><h2>Your map starts with one destination.</h2><p>Add a topic or source above, then create your personalized learning route.</p><button type="button" onClick={handleEmptyAction} disabled={generating} className="generate-button mt-5 flex h-10 items-center gap-2 rounded-[7px] bg-[#1759dc] px-5 text-[11px] font-semibold text-white hover:bg-[#1d68f5]"><WandSparkles size={15} />{generating ? 'Creating map…' : canGenerate ? 'Create my map' : 'Add a source to begin'}</button></div>}
        <svg viewBox={`0 0 960 ${mapHeight}`} className={`h-full w-full ${panning ? 'is-panning' : ''} ${editing ? 'is-editing' : ''}`} role="img" aria-labelledby="map-title map-description" onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onClickCapture={event => { if (suppressStationClick.current) { event.stopPropagation(); suppressStationClick.current = false } }}>
          <title id="map-title">{title} prerequisite learning path</title>
          <desc id="map-description">A metro-style map linking foundations, core concepts, advanced topics, and applications.</desc>
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#26384c" strokeWidth="1" opacity=".32" />
            </pattern>
            <filter id="station-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g ref={viewport} className="map-viewport" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            <rect width="960" height={mapHeight} fill="url(#grid)" />

            {visibleConcepts?.length ? <>
              <g className="active-routes generated-routes" fill="none" strokeLinecap="round" strokeLinejoin="round">
                {lineTracks.map(line => <path key={line.id} className={selected && !line.concept_ids.some(id => id === selectedId || prerequisiteIds.has(id)) ? 'dimmed-edge' : ''} d={line.path} transform={line.templatePath ? 'translate(35 45) scale(.9 .92)' : undefined} stroke={line.color} strokeWidth="7" pathLength="1" />)}
                {edges.map(edge => {
                  const from = layout.get(edge.from)
                  const to = layout.get(edge.to)
                  const required = prerequisiteIds.has(edge.from) && (prerequisiteIds.has(edge.to) || edge.to === selectedId)
                  const fromLine = lineByConcept.get(edge.from)
                  const goalConnection = edge.to === goalId
                  const sameLine = fromLine?.id === lineByConcept.get(edge.to)?.id
                  return from && to && visibleIds.has(edge.from) && visibleIds.has(edge.to) && (goalConnection || (nodeLabelStyle !== 'metro' && !sameLine))
                    ? <path className={`concept-edge ${goalConnection ? 'goal-edge' : required ? 'required-edge' : selected ? 'dimmed-edge' : ''}`} data-edge-from={edge.from} data-edge-to={edge.to} key={`${edge.from}-${edge.to}`} d={metroPath([from, to])} stroke={fromLine?.color ?? '#40516a'} strokeWidth={goalConnection ? 5 : 3} pathLength="1" />
                    : null
                })}
              </g>
              <g className="signal-particles" aria-hidden="true">
                {lineTracks.filter(line => !line.templatePath).map((line, index) => <circle className="map-signal-particle" key={`signal-${line.id}`} r="3.5" fill={line.color}><animateMotion dur={`${4.8 + (index % 4) * .65}s`} begin={`${-(index * .9)}s`} repeatCount="indefinite" path={line.path} /></circle>)}
              </g>
              {visibleConcepts.map((concept, conceptIndex) => {
                const point = layout.get(concept.id)!
                const current = concept.id === todayId
                const goal = concept.id === goalId
                const isSelected = concept.id === selectedId
                const isRequired = prerequisiteIds.has(concept.id)
                const related = !selected || isSelected || isRequired || unlockedConcepts.some(item => item.id === concept.id)
                return <g
                  key={concept.id}
                  className={`metro-station generated-station interactive-station ${point.interchange ? 'interchange-station' : ''} ${current ? 'current-station' : ''} ${goal ? 'goal-station' : ''} ${isSelected ? 'selected-station' : ''} ${isRequired ? 'required-station' : ''} ${completed.has(concept.id) ? 'completed-station' : ''} ${known.has(concept.id) ? 'known-station' : ''} ${related ? '' : 'dimmed-station'}`}
                  style={{ '--station-color': stationColor(concept) } as CSSProperties}
                  data-concept-id={concept.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={editing ? `${concept.name}. Drag or use arrow keys to move.` : `${concept.name}: ${concept.description}. Select station; double click to start.`}
                  onPointerDown={event => startNodeDrag(concept.id, point, event)}
                  onClick={editing ? undefined : event => selectConcept(concept.id, event)}
                  onDoubleClick={editing ? undefined : () => onStartConcept?.(concept.id)}
                  onKeyDown={event => {
                    if (editing && event.key.startsWith('Arrow')) {
                      event.preventDefault()
                      const step = event.shiftKey ? 1 : 10
                      nudgeNode(concept.id, point, event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0, event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0)
                      return
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectConcept(concept.id)
                    }
                  }}
                >
                  <circle className="station-hit" cx={point.x} cy={point.y} r="25" />
                  {point.interchange && <circle cx={point.x} cy={point.y} r="16" fill="#0a1726" stroke="#dfe9f7" strokeWidth="3" />}
                  {isSelected && <circle className="station-selection" cx={point.x} cy={point.y} r="20" />}
                  {isSelected && <g className="station-spark" aria-hidden="true"><path d={`M ${point.x - 27} ${point.y}h-8M ${point.x + 27} ${point.y}h8M ${point.x} ${point.y - 27}v-8M ${point.x} ${point.y + 27}v8M ${point.x - 19} ${point.y - 19}l-6 -6M ${point.x + 19} ${point.y - 19}l6 -6M ${point.x - 19} ${point.y + 19}l-6 6M ${point.x + 19} ${point.y + 19}l6 6`} /></g>}
                  {current && <circle className="station-current" cx={point.x} cy={point.y} r="19" fill="none" />}
                  <circle cx={point.x} cy={point.y} r="9" fill="#091523" stroke={stationColor(concept)} strokeWidth="5" />
                  <circle cx={point.x} cy={point.y} r="3.5" fill="#e8eef7" />
                  {!current && !goal && <text x={point.x} y={point.y - (point.interchange ? 22 : 16)} textAnchor="middle" className="station-number">{String(conceptIndex + 1).padStart(2, '0')}</text>}
                  {current && <g className="map-today-marker"><rect x={point.x - 30} y={point.y - 43} width="60" height="19" rx="3" /><text x={point.x} y={point.y - 30} textAnchor="middle">TODAY</text></g>}
                  {goal && <g className="map-goal-marker"><circle cx={point.x} cy={point.y} r="17" /><text x={point.x + 24} y={point.y - 12}>END GOAL</text></g>}
                  {(completed.has(concept.id) || known.has(concept.id)) && <path className="station-check" d="M-4 0l3 3 6-7" transform={`translate(${point.x} ${point.y})`} />}
                </g>
              })}
              <g className={`station-label-layer ${nodeLabelStyle}`} aria-hidden="true">
                {nodeLabelStyle === 'smart' && <g className="station-label-leaders">{visibleConcepts.map(concept => {
                  const point = layout.get(concept.id)!
                  const placement = labelLayout.get(concept.id)!
                  return <path key={`leader-${concept.id}`} className="station-label-leader" style={{ '--station-color': stationColor(concept) } as CSSProperties} d={`M${point.x} ${point.y}L${placement.leaderX} ${placement.leaderY}`} />
                })}</g>}
                {nodeLabelStyle === 'smart' && <g className="station-label-boxes">{visibleConcepts.map(concept => {
                  const placement = labelLayout.get(concept.id)!
                  return <rect key={`box-${concept.id}`} className="station-label-box" style={{ '--station-color': stationColor(concept) } as CSSProperties} x={placement.x} y={placement.y} width={placement.width} height={placement.height} rx="3" />
                })}</g>}
                <g className="station-label-texts">{visibleConcepts.map(concept => {
                  const placement = labelLayout.get(concept.id)!
                  const offset = nodeLabelStyle === 'metro' ? 2 : 6
                  return <text key={`label-${concept.id}`} x={placement.x + offset} y={placement.y + (nodeLabelStyle === 'metro' ? 13 : 14)} className="station-label">{stationLabel(concept.name).map((line, index) => <tspan key={line} x={placement.x + offset} dy={index ? nodeLabelStyle === 'metro' ? 14 : 13 : 0}>{line}</tspan>)}</text>
                })}</g>
              </g>
            </> : !empty ? <>
            <g className="inactive-routes" fill="none" stroke="#334258" strokeWidth="2" strokeDasharray="5 7">
              <polyline points="12,385 82,385 121,340 190,340 220,306 286,306 327,353 403,353 450,390 452,535 590,535 590,571" />
              <polyline points="70,14 118,64 173,64 211,100 316,100 355,146 458,146 501,182 555,182 597,147 724,147 764,102 894,102 916,129 916,186" />
              <polyline points="174,18 219,66 323,66 361,104 361,162 405,202 500,202 545,265 592,265 628,297 713,297 753,334 908,334" />
              <polyline points="43,527 104,527 131,502 211,502 250,535 348,535 379,566 682,566 711,538 903,538" />
            </g>
            <g className="inactive-stations" fill="#0a1726" stroke="#35455b" strokeWidth="2">
              {[['82','385'],['121','340'],['220','306'],['403','353'],['452','535'],['590','535'],['118','64'],['211','100'],['355','146'],['501','182'],['764','102'],['916','186'],['219','66'],['361','162'],['545','265'],['753','334'],['131','502'],['250','535'],['379','566'],['711','538']].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" />)}
            </g>

            <g className="active-routes" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6">
              {routes.map(({ route, points }, index) => <polyline key={`${route}-${index}`} points={stretchPoints(points)} stroke={routeColor(route)} pathLength="1" />)}
              {stations.map(station => nodePositions[station.label] ? <path key={`moved-${station.label}`} className="edited-route" d={metroPath([station, nodePositions[station.label]])} stroke={routeColor(station.route)} /> : null)}
            </g>
            <g className="signal-particles" aria-hidden="true">
              {routes.map(({ route, points }, index) => <circle className="map-signal-particle" key={`signal-${route}-${index}`} r="4" fill={routeColor(route)}><animateMotion dur={`${5.2 + index * .45}s`} begin={`${-(index * 1.15)}s`} repeatCount="indefinite" path={motionPath(points)} /></circle>)}
            </g>
            {stations.map(station => {
              const point = nodePositions[station.label] ?? station
              return <MetroStation key={station.label} station={station} point={point} color={routeColor(station.route)} goal={station.label === goalId} selected={station.label === selectedId} required={prerequisiteIds.has(station.label)} related={!selected || station.label === selectedId || prerequisiteIds.has(station.label) || unlockedConcepts.some(item => item.id === station.label)} completed={completed.has(station.label)} known={known.has(station.label)} editing={editing} onDragStart={event => startNodeDrag(station.label, point, event)} onNudge={(dx, dy) => nudgeNode(station.label, point, dx, dy)} onSelect={event => selectConcept(station.label, event)} onStart={() => onStartConcept?.(station.label)} />
            })}
            </> : null}
          </g>
        </svg>

        {editing && <div className="map-edit-hint" role="status">Drag stations — routes follow</div>}
        {clickBurst && !editing && <div className="click-burst" style={{ left: clickBurst.x, top: clickBurst.y - 78 }} key={clickBurst.id} aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>}
        {selected && <aside className="map-inspector" aria-live="polite">
          <header>
            <span style={{ '--station-color': stationColor(selected) } as CSSProperties}><i />{lineByConcept.get(selected.id)?.name ?? categoryLabels[selected.category]}</span>
            <button type="button" aria-label="Close station details" onClick={closeInspector}><X size={14} /></button>
          </header>
          <h2>{selected.name}</h2>
          <p>{selected.description}</p>
          <div className="map-inspector-stats"><span><strong>{selected.estimated_minutes}</strong> min</span><span><strong>{prerequisiteIds.size}</strong> required</span><span><strong>{unlockedConcepts.length}</strong> unlocks</span></div>
          {directPrerequisites.length > 0 && <div className="map-prerequisites">
            <small>Direct prerequisites</small>
            <div>{directPrerequisites.map(concept => <button type="button" key={concept.id} onClick={() => selectConcept(concept.id)}><i style={{ background: stationColor(concept) }} />{concept.name}</button>)}</div>
          </div>}
          <div className="map-inspector-actions with-path">
            {onOpenNotebook && <button type="button" className="open-notebook" onClick={() => onOpenNotebook(selected.id)}><BookOpen size={14} />Open notebook</button>}
            {onToggleKnown && <button type="button" className="known-node" aria-pressed={known.has(selected.id)} onClick={() => onToggleKnown(selected.id)}><Check size={14} />{known.has(selected.id) ? 'Known already' : 'Mark as known'}</button>}
            {onStartConcept && <button type="button" className="start-node" onClick={() => onStartConcept(selected.id)}>{completed.has(selected.id) ? <Check size={14} /> : <Play size={14} fill="currentColor" />}{completed.has(selected.id) ? 'Review lesson' : 'Start lesson'}</button>}
            {onExpandConcept && <button type="button" className="extend-line" onClick={() => onExpandConcept(selected.id, selected.name)}><Plus size={14} />Extend the line</button>}
            <button type="button" className="focus-path" aria-pressed={!!requiredPathIds} aria-busy={requiredPathLoading} onClick={() => requiredPathIds ? setRequiredPathIds(null) : requestRequiredPath()}><GitBranch size={14} />{requiredPathLoading ? 'Finding path…' : requiredPathIds ? 'Show full map' : 'Required path'}</button>
          </div>
        </aside>}

        <div className="map-tools absolute bottom-4 left-4 flex h-10 items-center divide-x divide-[#253447] overflow-hidden rounded-lg border border-[#28374a] bg-[#081321]/95 text-[#9aa6b7]">
          <button type="button" aria-label={editing ? 'Finish editing map' : 'Edit map layout'} aria-pressed={editing} onClick={() => { setEditing(value => !value); if (!editing) closeInspector() }} className="edit-map px-3 hover:text-white">{editing ? <Check size={16} /> : <Pencil size={15} />}<span>{editing ? 'Done' : 'Edit'}</span></button>
          {editing && Object.keys(nodePositions).length > 0 && <button type="button" aria-label="Reset map layout" onClick={() => setNodePositions({})} className="px-3 hover:text-white"><RotateCcw size={15} /></button>}
          <button type="button" aria-label="Reset zoom" onClick={() => setZoom(1)} className="px-3 hover:text-white"><Crosshair size={17} /></button>
          <button type="button" aria-label="Zoom out" onClick={() => changeZoom(-.25)} disabled={zoom <= .75} className="px-2 hover:text-white"><Minus size={14} /></button>
          <span className="px-2 text-xs text-[#e7edf6]">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => changeZoom(.25)} disabled={zoom >= 1.5} className="px-2 hover:text-white"><Plus size={14} /></button>
          <button type="button" aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} aria-pressed={fullscreen} onClick={toggleFullscreen} className="px-3 hover:text-white">{fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
        </div>
      </div>
    </section>
  )
}
