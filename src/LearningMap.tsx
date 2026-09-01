import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Check, Clock3, Crosshair, GitBranch, Maximize2, Minimize2, Minus, Play, Plus, WandSparkles, X } from 'lucide-react'
import { stations, type RouteName, type Station } from './mockData'

const colors: Record<RouteName, string> = {
  blue: '#2e80ff',
  green: '#48b96a',
  purple: '#8d4dd2',
  orange: '#f0a512',
}

type LearningConcept = { id: string; name: string; description: string; estimated_minutes: number; category: 'foundation' | 'core' | 'advanced' | 'application'; level: number }
type LearningEdge = { from: string; to: string }
type LearningLine = { id: string; name: string; description: string; concept_ids: string[] }
const categoryColors = { foundation: colors.blue, core: colors.green, advanced: colors.purple, application: colors.orange }
const linePalette = ['#2e80ff', '#48b96a', '#9a5dea', '#f0a512', '#17bebb', '#ff6b6b', '#e6d34e', '#ee75c5']
const routeCategories = { blue: 'foundation', green: 'core', purple: 'advanced', orange: 'application' } as const
const categoryLabels = { foundation: 'Foundation', core: 'Core concept', advanced: 'Advanced', application: 'Application' }

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

const routes: { route: RouteName; points: string }[] = [
  { route: 'blue', points: '55,48 60,84 69,104 82,145 103,171 153,224 200,245 239,267 307,267 362,234' },
  { route: 'purple', points: '245,116 250,143 266,167 289,205 333,205 362,234 371,283 437,335 496,399 552,399 608,326 793,326 838,289 873,328 873,393 925,446' },
  { route: 'purple', points: '496,399 496,485' },
  { route: 'green', points: '362,234 420,188 420,68 585,76 640,126 640,171 608,199 608,234 724,234 771,269 804,269 838,289' },
  { route: 'green', points: '420,188 465,232 525,232 608,234' },
  { route: 'orange', points: '362,234 306,290 238,342 190,374 145,408 145,461 279,461 330,512' },
  { route: 'orange', points: '608,326 678,347 729,366 765,423 765,454 795,500 795,536 814,560' },
]

function MetroStation({ station, selected, onSelect, onStart }: { station: Station; selected: boolean; onSelect: () => void; onStart: () => void }) {
  const { x, route, interchange, current } = station
  const y = mapY(station.y)
  const labelX = station.labelX ?? x + 19
  const labelY = station.labelY ? mapY(station.labelY) : y + 4
  const lines = station.lines ?? [station.label]

  return (
    <g
      className={`metro-station interactive-station ${current ? 'current-station' : ''} ${selected ? 'selected-station' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${station.label}. Select station; double click to start.`}
      onClick={onSelect}
      onDoubleClick={onStart}
      onKeyDown={(event: KeyboardEvent<SVGGElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <circle className="station-hit" cx={x} cy={y} r="25" />
      {selected && <circle className="station-selection" cx={x} cy={y} r="22" />}
      {current && (
        <>
          <circle className="station-current" cx={x} cy={y} r="24" fill="#071423" stroke="#f7fbff" strokeWidth="3" />
          <circle cx={x} cy={y} r="20" fill="none" stroke="#2e80ff" strokeWidth="4" />
          <circle cx={x} cy={y} r="10" fill="#f7fbff" />
          <g transform={`translate(${x + 30} ${y - 31})`}>
            <rect width="53" height="23" rx="4" fill="#1668f5" />
            <text x="26.5" y="15.5" textAnchor="middle" className="today-label">TODAY</text>
          </g>
        </>
      )}
      {!current && (
        <>
          {interchange && <circle cx={x} cy={y} r="17" fill="#0a1726" stroke="#dfe9f7" strokeWidth="3" />}
          <circle cx={x} cy={y} r={interchange ? 8 : 9} fill="#091523" stroke={colors[route]} strokeWidth="4" />
          <circle cx={x} cy={y} r={interchange ? 4.5 : 4} fill="#e8eef7" />
        </>
      )}
      <text x={labelX} y={labelY} className={current ? 'station-label current-label' : 'station-label'}>
        {lines.map((line, index) => <tspan x={labelX} dy={index ? 16 : 0} key={line}>{line}</tspan>)}
      </text>
    </g>
  )
}

export default function LearningMap({ title = 'Quantum Computing', concepts, edges = [], lines = [], currentConceptId, completedConceptIds = [], empty = false, canGenerate = false, generating = false, onGenerate, onStartConcept, onExpandConcept }: {
  title?: string
  concepts?: LearningConcept[]
  edges?: LearningEdge[]
  lines?: LearningLine[]
  currentConceptId?: string
  completedConceptIds?: string[]
  empty?: boolean
  canGenerate?: boolean
  generating?: boolean
  onGenerate?: () => void
  onStartConcept?: (conceptId: string) => void
  onExpandConcept?: (conceptId: string, conceptName: string) => void
}) {
  const card = useRef<HTMLElement>(null)
  const [zoom, setZoom] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [selectedId, setSelectedId] = useState(currentConceptId)
  const [pathOnly, setPathOnly] = useState(false)
  const generated = !!concepts?.length
  const presetStation = !generated ? stations.find(station => station.label === selectedId) : undefined
  const selected: LearningConcept | undefined = concepts?.find(concept => concept.id === selectedId) ?? (presetStation ? {
    id: presetStation.label,
    name: presetStation.label,
    description: `Understand ${presetStation.label} and how it connects to the wider Quantum Computing path.`,
    estimated_minutes: 30,
    category: routeCategories[presetStation.route],
    level: 0,
  } : undefined)
  const prerequisiteIds = useMemo(() => collectPrerequisites(generated ? selectedId : undefined, edges), [edges, generated, selectedId])
  const directPrerequisites = concepts?.filter(concept => edges.some(edge => edge.from === concept.id && edge.to === selectedId)) ?? []
  const unlockedConcepts = concepts?.filter(concept => edges.some(edge => edge.from === selectedId && edge.to === concept.id)) ?? []
  const completed = useMemo(() => new Set(completedConceptIds), [completedConceptIds])
  const lineByConcept = useMemo(() => new Map(lines.flatMap((line, index) => line.concept_ids.map(id => [id, { ...line, color: linePalette[index % linePalette.length], index }] as const))), [lines])
  const stationColor = (concept: LearningConcept) => lineByConcept.get(concept.id)?.color ?? categoryColors[concept.category]
  const visibleConcepts = pathOnly && selectedId
    ? concepts?.filter(concept => concept.id === selectedId || prerequisiteIds.has(concept.id))
    : concepts
  const visibleIds = useMemo(() => new Set(visibleConcepts?.map(concept => concept.id)), [visibleConcepts])
  const layout = useMemo(() => {
    if (!visibleConcepts?.length) return new Map<string, { x: number; y: number }>()
    const maxLevel = Math.max(...visibleConcepts.map(concept => concept.level), 1)
    return new Map(visibleConcepts.map(concept => {
      const peers = visibleConcepts.filter(item => item.level === concept.level).sort((a, b) => (lineByConcept.get(a.id)?.index ?? 99) - (lineByConcept.get(b.id)?.index ?? 99))
      const index = peers.findIndex(item => item.id === concept.id)
      return [concept.id, { x: 70 + concept.level / maxLevel * 820, y: 55 + (index + 1) * 490 / (peers.length + 1) }]
    }))
  }, [lineByConcept, visibleConcepts])

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === card.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  useEffect(() => {
    setSelectedId(currentConceptId)
    setPathOnly(false)
  }, [concepts, currentConceptId])

  const changeZoom = (amount: number) => setZoom(value => Math.min(1.5, Math.max(.75, value + amount)))
  const toggleFullscreen = () => {
    const action = document.fullscreenElement ? document.exitFullscreen() : card.current?.requestFullscreen()
    action?.catch(() => undefined)
  }
  const selectConcept = (conceptId: string) => setSelectedId(conceptId)
  const closeInspector = () => {
    setSelectedId(undefined)
    setPathOnly(false)
  }

  return (
    <section ref={card} className="map-card min-h-0 overflow-hidden rounded-[10px] border border-line bg-panel" aria-label="Learning map">
      <header className="map-heading flex h-14 items-center justify-between border-b border-[#1b293a] px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.13em] text-muted">Learning map</p>
          <h1 className="mt-0.5 text-[17px] font-semibold text-[#f0f4fa]" title={selected?.description}>{selected?.name ?? title}</h1>
        </div>
        <div className="legend flex items-center gap-5 text-[11px] text-[#a6b0bf]">
          {generated && lines.length ? lines.map((line, index) => <span key={line.id} title={line.description}><i style={{ background: linePalette[index % linePalette.length] }} />{line.name}</span>) : <>
            <span><i className="bg-[#2e80ff]" />Foundations</span>
            <span><i className="bg-[#48b96a]" />Core concepts</span>
            <span><i className="bg-[#8d4dd2]" />Advanced topics</span>
            <span><i className="bg-[#f0a512]" />Applications</span>
          </>}
        </div>
      </header>

      <div className="relative h-[calc(100%-56px)] min-h-0">
        {empty && !concepts?.length && <div className="empty-map"><div className="empty-map-line"><i /><i /><i /><i /></div><h2>Your map starts with one destination.</h2><p>Add a topic or source above, then create your personalized learning route.</p><button type="button" onClick={onGenerate} disabled={!canGenerate || generating} className="generate-button mt-5 flex h-10 items-center gap-2 rounded-[7px] bg-[#1759dc] px-5 text-[11px] font-semibold text-white hover:bg-[#1d68f5]"><WandSparkles size={15} />{generating ? 'Creating map…' : canGenerate ? 'Create my map' : 'Add a source to begin'}</button></div>}
        <svg viewBox="0 0 960 600" className="h-full w-full" role="img" aria-labelledby="map-title map-description">
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
          <g className="map-viewport" style={{ transform: `scale(${zoom})` }}>
            <rect width="960" height="600" fill="url(#grid)" />

            {visibleConcepts?.length ? <>
              <g className="active-routes" fill="none" stroke="#40516a" strokeWidth="3">
                {edges.map(edge => {
                  const from = layout.get(edge.from)
                  const to = layout.get(edge.to)
                  const required = prerequisiteIds.has(edge.from) && (prerequisiteIds.has(edge.to) || edge.to === selectedId)
                  const fromLine = lineByConcept.get(edge.from)
                  const edgeColor = fromLine && fromLine.id === lineByConcept.get(edge.to)?.id ? fromLine.color : '#40516a'
                  return from && to && visibleIds.has(edge.from) && visibleIds.has(edge.to)
                    ? <line className={`concept-edge ${required ? 'required-edge' : selected ? 'dimmed-edge' : ''}`} style={required ? undefined : { stroke: edgeColor }} key={`${edge.from}-${edge.to}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                    : null
                })}
              </g>
              {visibleConcepts.map(concept => {
                const point = layout.get(concept.id)!
                const current = concept.id === currentConceptId
                const isSelected = concept.id === selectedId
                const isRequired = prerequisiteIds.has(concept.id)
                const related = !selected || isSelected || isRequired || unlockedConcepts.some(item => item.id === concept.id)
                return <g
                  key={concept.id}
                  className={`metro-station generated-station interactive-station ${current ? 'current-station' : ''} ${isSelected ? 'selected-station' : ''} ${isRequired ? 'required-station' : ''} ${completed.has(concept.id) ? 'completed-station' : ''} ${related ? '' : 'dimmed-station'}`}
                  style={{ '--station-color': stationColor(concept) } as CSSProperties}
                  data-concept-id={concept.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${concept.name}: ${concept.description}. Select station; double click to start.`}
                  onClick={() => selectConcept(concept.id)}
                  onDoubleClick={() => onStartConcept?.(concept.id)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectConcept(concept.id)
                    }
                  }}
                >
                  <circle className="station-hit" cx={point.x} cy={point.y} r="25" />
                  {isSelected && <circle className="station-selection" cx={point.x} cy={point.y} r="20" />}
                  {current && <circle className="station-current" cx={point.x} cy={point.y} r="19" fill="none" />}
                  <circle cx={point.x} cy={point.y} r="9" fill="#091523" stroke={stationColor(concept)} strokeWidth="5" />
                  <circle cx={point.x} cy={point.y} r="3.5" fill="#e8eef7" />
                  {completed.has(concept.id) && <path className="station-check" d="M-4 0l3 3 6-7" transform={`translate(${point.x} ${point.y})`} />}
                  <text x={point.x + 15} y={point.y + 4} className="station-label">{concept.name}</text>
                </g>
              })}
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
              {routes.map(({ route, points }, index) => <polyline key={`${route}-${index}`} points={stretchPoints(points)} stroke={colors[route]} pathLength="1" />)}
            </g>
            {stations.map(station => <MetroStation key={station.label} station={station} selected={station.label === selectedId} onSelect={() => selectConcept(station.label)} onStart={() => onStartConcept?.(station.label)} />)}
            </> : null}
          </g>
        </svg>

        {selected && <aside className="map-inspector" aria-live="polite">
          <header>
            <span style={{ '--station-color': stationColor(selected) } as CSSProperties}><i />{lineByConcept.get(selected.id)?.name ?? categoryLabels[selected.category]}</span>
            <button type="button" aria-label="Close station details" onClick={closeInspector}><X size={14} /></button>
          </header>
          <h2>{selected.name}</h2>
          <p>{selected.description}</p>
          {generated ? <div className="map-inspector-stats"><span><strong>{selected.estimated_minutes}</strong> min</span><span><strong>{prerequisiteIds.size}</strong> required</span><span><strong>{unlockedConcepts.length}</strong> unlocks</span></div> : <div className="map-inspector-meta"><span><Clock3 size={13} />{selected.estimated_minutes} min</span><span><i />Ready to start</span></div>}
          {directPrerequisites.length > 0 && <div className="map-prerequisites">
            <small>Direct prerequisites</small>
            <div>{directPrerequisites.map(concept => <button type="button" key={concept.id} onClick={() => selectConcept(concept.id)}><i style={{ background: stationColor(concept) }} />{concept.name}</button>)}</div>
          </div>}
          <div className={`map-inspector-actions ${generated ? 'with-path' : ''}`}>
            {onStartConcept && <button type="button" className="start-node" onClick={() => onStartConcept(selected.id)}>{completed.has(selected.id) ? <Check size={14} /> : <Play size={14} fill="currentColor" />}{completed.has(selected.id) ? 'Review lesson' : 'Start lesson'}</button>}
            {onExpandConcept && <button type="button" className="extend-line" onClick={() => onExpandConcept(selected.id, selected.name)}><Plus size={14} />Extend the line</button>}
            {generated && <button type="button" className="focus-path" aria-pressed={pathOnly} onClick={() => setPathOnly(value => !value)}><GitBranch size={14} />{pathOnly ? 'Show full map' : `Required path · ${prerequisiteIds.size + 1}`}</button>}
          </div>
        </aside>}

        <div className="map-tools absolute bottom-4 left-4 flex h-10 items-center divide-x divide-[#253447] overflow-hidden rounded-lg border border-[#28374a] bg-[#081321]/95 text-[#9aa6b7]">
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
