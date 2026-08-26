import { Crosshair, Maximize2, Minus, Plus } from 'lucide-react'
import { stations, type RouteName, type Station } from './mockData'

const colors: Record<RouteName, string> = {
  blue: '#2e80ff',
  green: '#48b96a',
  purple: '#8d4dd2',
  orange: '#f0a512',
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

function MetroStation({ station }: { station: Station }) {
  const { x, route, interchange, current } = station
  const y = mapY(station.y)
  const labelX = station.labelX ?? x + 19
  const labelY = station.labelY ? mapY(station.labelY) : y + 4
  const lines = station.lines ?? [station.label]

  return (
    <g className="metro-station">
      {current && (
        <>
          <circle cx={x} cy={y} r="24" fill="#071423" stroke="#f7fbff" strokeWidth="3" />
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

export default function LearningMap() {
  return (
    <section className="map-card min-h-0 overflow-hidden rounded-[10px] border border-line bg-panel" aria-label="Learning map">
      <header className="map-heading flex h-14 items-center justify-between border-b border-[#1b293a] px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.13em] text-muted">Learning map</p>
          <h1 className="mt-0.5 text-[17px] font-semibold text-[#f0f4fa]">Quantum Computing</h1>
        </div>
        <div className="legend flex items-center gap-5 text-[11px] text-[#a6b0bf]">
          <span><i className="bg-[#2e80ff]" />Foundations</span>
          <span><i className="bg-[#48b96a]" />Core concepts</span>
          <span><i className="bg-[#8d4dd2]" />Advanced topics</span>
          <span><i className="bg-[#f0a512]" />Applications</span>
        </div>
      </header>

      <div className="relative h-[calc(100%-56px)] min-h-0">
        <svg viewBox="0 0 960 600" className="h-full w-full" role="img" aria-labelledby="map-title map-description">
          <title id="map-title">Quantum computing prerequisite learning path</title>
          <desc id="map-description">A metro-style map linking foundations, core concepts, advanced topics, and applications.</desc>
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#26384c" strokeWidth="1" opacity=".32" />
            </pattern>
          </defs>
          <rect width="960" height="600" fill="url(#grid)" />

          <g className="inactive-routes" fill="none" stroke="#334258" strokeWidth="2" strokeDasharray="5 7">
            <polyline points="12,385 82,385 121,340 190,340 220,306 286,306 327,353 403,353 450,390 452,535 590,535 590,571" />
            <polyline points="70,14 118,64 173,64 211,100 316,100 355,146 458,146 501,182 555,182 597,147 724,147 764,102 894,102 916,129 916,186" />
            <polyline points="174,18 219,66 323,66 361,104 361,162 405,202 500,202 545,265 592,265 628,297 713,297 753,334 908,334" />
            <polyline points="43,527 104,527 131,502 211,502 250,535 348,535 379,566 682,566 711,538 903,538" />
          </g>
          <g className="inactive-stations" fill="#0a1726" stroke="#35455b" strokeWidth="2">
            {[['82','385'],['121','340'],['220','306'],['403','353'],['452','535'],['590','535'],['118','64'],['211','100'],['355','146'],['501','182'],['764','102'],['916','186'],['219','66'],['361','162'],['545','265'],['753','334'],['131','502'],['250','535'],['379','566'],['711','538']].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" />)}
          </g>

          <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6">
            {routes.map(({ route, points }, index) => <polyline key={`${route}-${index}`} points={stretchPoints(points)} stroke={colors[route]} />)}
          </g>
          {stations.map(station => <MetroStation key={station.label} station={station} />)}
        </svg>

        <div className="map-tools absolute bottom-4 left-4 flex h-10 items-center divide-x divide-[#253447] overflow-hidden rounded-lg border border-[#28374a] bg-[#081321]/95 text-[#9aa6b7]">
          <button aria-label="Center map" className="px-3 hover:text-white"><Crosshair size={17} /></button>
          <button aria-label="Zoom out" className="px-2 hover:text-white"><Minus size={14} /></button>
          <span className="px-2 text-xs text-[#e7edf6]">100%</span>
          <button aria-label="Zoom in" className="px-2 hover:text-white"><Plus size={14} /></button>
          <button aria-label="Fullscreen" className="px-3 hover:text-white"><Maximize2 size={16} /></button>
        </div>
      </div>
    </section>
  )
}
