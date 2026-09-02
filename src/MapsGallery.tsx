import { ArrowLeft, MapPinned } from 'lucide-react'

export type TemplateStation = { x: number; y: number; role?: 'start' | 'interchange' | 'goal' }
type Line = { name: string; color: string; path: string }
export type MapTemplate = { code: string; name: string; use: string; logic: string; stations: readonly TemplateStation[]; lines: readonly Line[] }

export const mapTemplates: readonly MapTemplate[] = [
  {
    code: 'C16', name: 'Bases que convergen', use: 'hasta 16 conceptos · 4 líneas',
    logic: 'Dos familias de prerrequisitos se unen en un núcleo común antes de pasar a práctica y objetivo.',
    lines: [
      { name: 'Conceptos base', color: '#35c9ff', path: 'M70 100H230L300 170H430' },
      { name: 'Herramientas', color: '#28df9b', path: 'M70 250H230L300 170' },
      { name: 'Núcleo', color: '#bd78ff', path: 'M300 170H500L570 240H700' },
      { name: 'Aplicación', color: '#ffb928', path: 'M430 170L500 100H640L700 160V240H910' },
    ],
    stations: [
      { x: 70, y: 100, role: 'start' }, { x: 150, y: 100 }, { x: 230, y: 100 }, { x: 70, y: 250 }, { x: 150, y: 250 }, { x: 230, y: 250 },
      { x: 300, y: 170, role: 'interchange' }, { x: 430, y: 170, role: 'interchange' }, { x: 500, y: 170 }, { x: 570, y: 240 }, { x: 700, y: 240, role: 'interchange' },
      { x: 500, y: 100 }, { x: 640, y: 100 }, { x: 700, y: 160 }, { x: 810, y: 240 }, { x: 910, y: 240, role: 'goal' },
    ],
  },
  {
    code: 'B19', name: 'Teoría y práctica trenzadas', use: 'hasta 19 conceptos · 3 líneas',
    logic: 'Dos recorridos paralelos avanzan por etapas y se cruzan para que entender y hacer se refuercen mutuamente.',
    lines: [
      { name: 'Teoría', color: '#35c9ff', path: 'M70 130H300L370 200H520L590 270H760' },
      { name: 'Práctica', color: '#ffb928', path: 'M70 370H300L370 300H520L590 270H760L830 340H940' },
      { name: 'Puentes', color: '#28df9b', path: 'M300 130V370M520 200V300' },
    ],
    stations: [
      { x: 70, y: 130, role: 'start' }, { x: 150, y: 130 }, { x: 230, y: 130 }, { x: 300, y: 130, role: 'interchange' }, { x: 370, y: 200 }, { x: 520, y: 200, role: 'interchange' },
      { x: 590, y: 270, role: 'interchange' }, { x: 680, y: 270 }, { x: 760, y: 270, role: 'interchange' }, { x: 70, y: 370 }, { x: 150, y: 370 }, { x: 230, y: 370 },
      { x: 300, y: 370, role: 'interchange' }, { x: 370, y: 300 }, { x: 520, y: 300, role: 'interchange' }, { x: 300, y: 250 }, { x: 520, y: 250 },
      { x: 830, y: 340 }, { x: 940, y: 340, role: 'goal' },
    ],
  },
  {
    code: 'R21', name: 'Intercambiador central', use: '21 huecos · 4 líneas · estructura radial',
    logic: 'Varias bases independientes confluyen en un concepto bisagra; desde ahí parte una sola ruta de aplicación.',
    lines: [
      { name: 'Base', color: '#35c9ff', path: 'M90 80V150L140 220L210 290H330' },
      { name: 'Teoría', color: '#28df9b', path: 'M420 70H550L630 150V230L570 290H330' },
      { name: 'Profundidad', color: '#bd78ff', path: 'M180 110L220 180L260 240L330 290L400 360L470 430' },
      { name: 'Práctica', color: '#ffb928', path: 'M90 430H200L260 370L330 290H570L650 340L720 410H900' },
    ],
    stations: [
      { x: 90, y: 80, role: 'start' }, { x: 90, y: 150 }, { x: 140, y: 220 }, { x: 210, y: 290 },
      { x: 330, y: 290, role: 'interchange' }, { x: 420, y: 70 }, { x: 550, y: 70 }, { x: 630, y: 150 }, { x: 630, y: 230 }, { x: 570, y: 290, role: 'interchange' },
      { x: 180, y: 110 }, { x: 220, y: 180 }, { x: 260, y: 240 }, { x: 400, y: 360 }, { x: 470, y: 430 },
      { x: 90, y: 430 }, { x: 200, y: 430 }, { x: 260, y: 370 }, { x: 650, y: 340 }, { x: 720, y: 410 }, { x: 900, y: 410, role: 'goal' },
    ],
  },
  {
    code: 'D24', name: 'Doble intercambiador', use: '24 huecos · 5 líneas · dos áreas conectadas',
    logic: 'Dos núcleos de conocimiento agrupan líneas temáticas y una línea avanzada los conecta con la meta final.',
    lines: [
      { name: 'Lenguaje', color: '#35c9ff', path: 'M75 95H190L250 155V260H390L470 310H650' },
      { name: 'Método', color: '#28df9b', path: 'M250 65V155L320 225L390 260V370' },
      { name: 'Sistemas', color: '#bd78ff', path: 'M120 400L190 330L250 260H390L470 310H650L730 230H930' },
      { name: 'Taller', color: '#ffb928', path: 'M390 440V370L470 310H650L730 390H920' },
      { name: 'Especialidad', color: '#ff6685', path: 'M650 90V170L730 230V390L810 450H960' },
    ],
    stations: [
      { x: 75, y: 95, role: 'start' }, { x: 135, y: 95 }, { x: 190, y: 95 }, { x: 250, y: 155, role: 'interchange' }, { x: 250, y: 260 }, { x: 320, y: 260 },
      { x: 390, y: 260, role: 'interchange' }, { x: 470, y: 310 }, { x: 560, y: 310 }, { x: 650, y: 310, role: 'interchange' },
      { x: 250, y: 65 }, { x: 320, y: 225 }, { x: 390, y: 370 }, { x: 120, y: 400 }, { x: 190, y: 330 },
      { x: 730, y: 230, role: 'interchange' }, { x: 820, y: 230 }, { x: 930, y: 230 }, { x: 390, y: 440 }, { x: 730, y: 390 },
      { x: 820, y: 390 }, { x: 920, y: 390 }, { x: 650, y: 90 }, { x: 960, y: 450, role: 'goal' },
    ],
  },
  {
    code: 'E24', name: 'Tronco y especialidades', use: '24 huecos · 6 líneas · síntesis final',
    logic: 'Un tronco común abre teoría y práctica; sus especialidades vuelven a converger antes del objetivo.',
    lines: [
      { name: 'Fundamentos', color: '#35c9ff', path: 'M60 260H320' },
      { name: 'Teoría', color: '#28df9b', path: 'M320 260L400 170H650L730 250' },
      { name: 'Práctica', color: '#bd78ff', path: 'M320 260L400 350H650L730 250' },
      { name: 'Investigación', color: '#ffb928', path: 'M400 170V90H800L880 170L930 250' },
      { name: 'Proyectos', color: '#ff6685', path: 'M400 350V430H800L880 350L930 250' },
      { name: 'Síntesis', color: '#ffe04d', path: 'M730 250H930' },
    ],
    stations: [
      { x: 60, y: 260, role: 'start' }, { x: 130, y: 260 }, { x: 200, y: 260 }, { x: 260, y: 260 }, { x: 320, y: 260, role: 'interchange' },
      { x: 400, y: 170, role: 'interchange' }, { x: 520, y: 170 }, { x: 650, y: 170 }, { x: 730, y: 250, role: 'interchange' },
      { x: 400, y: 350, role: 'interchange' }, { x: 520, y: 350 }, { x: 650, y: 350 }, { x: 400, y: 90 }, { x: 560, y: 90 }, { x: 800, y: 90 }, { x: 880, y: 170 },
      { x: 400, y: 430 }, { x: 600, y: 430 }, { x: 800, y: 430 }, { x: 880, y: 350 }, { x: 800, y: 250 }, { x: 850, y: 250 },
      { x: 890, y: 250 }, { x: 930, y: 250, role: 'goal' },
    ],
  },
  {
    code: 'K20', name: 'Camino crítico y refuerzos', use: 'hasta 20 conceptos · 4 líneas',
    logic: 'Una secuencia principal marca el mínimo imprescindible; los ramales aportan prerrequisitos justo antes de necesitarlos.',
    lines: [
      { name: 'Camino crítico', color: '#ffb928', path: 'M70 420L180 310H340L450 200H620L730 100H930' },
      { name: 'Base conceptual', color: '#35c9ff', path: 'M70 90H210L340 220V310' },
      { name: 'Herramientas', color: '#28df9b', path: 'M180 310V400H340V310' },
      { name: 'Práctica guiada', color: '#bd78ff', path: 'M450 200V340H620V200' },
    ],
    stations: [
      { x: 70, y: 420, role: 'start' }, { x: 180, y: 310, role: 'interchange' }, { x: 260, y: 310 }, { x: 340, y: 310, role: 'interchange' },
      { x: 450, y: 200, role: 'interchange' }, { x: 535, y: 200 }, { x: 620, y: 200, role: 'interchange' }, { x: 730, y: 100 }, { x: 820, y: 100 }, { x: 930, y: 100, role: 'goal' },
      { x: 70, y: 90 }, { x: 140, y: 90 }, { x: 210, y: 90 }, { x: 340, y: 220 }, { x: 180, y: 400 }, { x: 260, y: 400 }, { x: 340, y: 400 },
      { x: 450, y: 340 }, { x: 535, y: 340 }, { x: 620, y: 340 },
    ],
  },
  {
    code: 'S22', name: 'Doble síntesis', use: 'hasta 22 conceptos · 6 líneas',
    logic: 'Tres grupos de bases forman un primer núcleo; teoría y práctica se desarrollan aparte y vuelven a unirse antes de la meta.',
    lines: [
      { name: 'Fundamentos', color: '#35c9ff', path: 'M60 90H240L340 190V260' },
      { name: 'Herramientas', color: '#28df9b', path: 'M60 260H340' },
      { name: 'Contexto', color: '#bd78ff', path: 'M60 430H240L340 330V260' },
      { name: 'Teoría', color: '#28df9b', path: 'M340 260L430 170H620L700 250' },
      { name: 'Práctica', color: '#ffb928', path: 'M340 260L430 350H620L700 250' },
      { name: 'Síntesis', color: '#ff6685', path: 'M700 250H930' },
    ],
    stations: [
      { x: 60, y: 90, role: 'start' }, { x: 150, y: 90 }, { x: 240, y: 90 }, { x: 340, y: 190 }, { x: 60, y: 260 }, { x: 150, y: 260 }, { x: 240, y: 260 },
      { x: 340, y: 260, role: 'interchange' }, { x: 60, y: 430 }, { x: 150, y: 430 }, { x: 240, y: 430 }, { x: 340, y: 330 },
      { x: 430, y: 170 }, { x: 520, y: 170 }, { x: 620, y: 170 }, { x: 700, y: 250, role: 'interchange' },
      { x: 430, y: 350 }, { x: 520, y: 350 }, { x: 620, y: 350 }, { x: 790, y: 250 }, { x: 860, y: 250 }, { x: 930, y: 250, role: 'goal' },
    ],
  },
  {
    code: 'X24', name: 'Puente interdisciplinar', use: '24 huecos · 6 líneas · dos dominios',
    logic: 'Dos disciplinas construyen sus propias bases y se encuentran en un puente común; evidencia y práctica validan la integración.',
    lines: [
      { name: 'Dominio A', color: '#35c9ff', path: 'M60 100H260L340 180V260' },
      { name: 'Dominio B', color: '#28df9b', path: 'M60 420H260L340 340V260' },
      { name: 'Puente', color: '#ffb928', path: 'M340 260H650' },
      { name: 'Evidencia', color: '#bd78ff', path: 'M480 260V100H760L840 180L900 260' },
      { name: 'Práctica', color: '#ff6685', path: 'M480 260V420H760L840 340L900 260' },
      { name: 'Integración', color: '#ffe04d', path: 'M650 260H950' },
    ],
    stations: [
      { x: 60, y: 100, role: 'start' }, { x: 140, y: 100 }, { x: 220, y: 100 }, { x: 260, y: 100 }, { x: 340, y: 180 }, { x: 340, y: 260, role: 'interchange' },
      { x: 60, y: 420 }, { x: 140, y: 420 }, { x: 220, y: 420 }, { x: 260, y: 420 }, { x: 340, y: 340 }, { x: 480, y: 260, role: 'interchange' },
      { x: 570, y: 260 }, { x: 650, y: 260, role: 'interchange' }, { x: 480, y: 100 }, { x: 600, y: 100 }, { x: 760, y: 100 }, { x: 840, y: 180 },
      { x: 480, y: 420 }, { x: 600, y: 420 }, { x: 760, y: 420 }, { x: 840, y: 340 }, { x: 900, y: 260, role: 'interchange' }, { x: 950, y: 260, role: 'goal' },
    ],
  },
  {
    code: 'M23', name: 'Módulos encadenados', use: 'hasta 23 conceptos · 4 líneas',
    logic: 'La ruta principal abre módulos sucesivos; cada módulo resuelve sus prerrequisitos locales antes de devolver al camino común.',
    lines: [
      { name: 'Ruta principal', color: '#35c9ff', path: 'M60 400H220L300 320H440L520 240H660L740 160H930' },
      { name: 'Módulo base', color: '#28df9b', path: 'M100 80H220L300 200V320' },
      { name: 'Módulo técnico', color: '#bd78ff', path: 'M440 100H600L660 160H740' },
      { name: 'Módulo aplicado', color: '#ffb928', path: 'M520 240V400H740V160' },
    ],
    stations: [
      { x: 60, y: 400, role: 'start' }, { x: 140, y: 400 }, { x: 220, y: 400 }, { x: 300, y: 320, role: 'interchange' }, { x: 370, y: 320 }, { x: 440, y: 320, role: 'interchange' },
      { x: 520, y: 240, role: 'interchange' }, { x: 590, y: 240 }, { x: 660, y: 240 }, { x: 740, y: 160, role: 'interchange' }, { x: 840, y: 160 }, { x: 930, y: 160, role: 'goal' },
      { x: 100, y: 80 }, { x: 160, y: 80 }, { x: 220, y: 80 }, { x: 300, y: 200 }, { x: 440, y: 100 }, { x: 520, y: 100 }, { x: 600, y: 100 }, { x: 660, y: 160 },
      { x: 520, y: 400 }, { x: 630, y: 400 }, { x: 740, y: 400 },
    ],
  },
  {
    code: 'V24', name: 'Capas con puertas', use: '24 huecos · 5 líneas · dificultad creciente',
    logic: 'Cada capa aporta conocimientos justo antes de una puerta de nivel; solo al superar la puerta se abre la siguiente etapa.',
    lines: [
      { name: 'Progresión', color: '#35c9ff', path: 'M60 80H300V180H500V280H700V380H930' },
      { name: 'Herramientas', color: '#28df9b', path: 'M60 180H300' },
      { name: 'Métodos', color: '#bd78ff', path: 'M60 280H500' },
      { name: 'Evidencia', color: '#ffb928', path: 'M60 380H700' },
      { name: 'Puertas', color: '#ff6685', path: 'M300 180L500 280L700 380' },
    ],
    stations: [
      { x: 60, y: 80, role: 'start' }, { x: 140, y: 80 }, { x: 220, y: 80 }, { x: 300, y: 80 }, { x: 300, y: 180, role: 'interchange' }, { x: 400, y: 180 },
      { x: 500, y: 180 }, { x: 500, y: 280, role: 'interchange' }, { x: 600, y: 280 }, { x: 700, y: 280 }, { x: 700, y: 380, role: 'interchange' }, { x: 820, y: 380 }, { x: 930, y: 380, role: 'goal' },
      { x: 60, y: 180 }, { x: 140, y: 180 }, { x: 220, y: 180 }, { x: 60, y: 280 }, { x: 140, y: 280 }, { x: 220, y: 280 }, { x: 350, y: 280 },
      { x: 60, y: 380 }, { x: 160, y: 380 }, { x: 260, y: 380 }, { x: 520, y: 380 },
    ],
  },
]

const roleLabel = { start: 'HOY · INICIO', interchange: 'TRANSBORDO', goal: 'META' } as const

function RoutePreview({ template }: { template: MapTemplate }) {
  return (
    <article className="network-template">
      <header><span>{template.code}</span><div><h2>{template.name}</h2><p>{template.use}</p></div><p className="network-logic">{template.logic}</p></header>
      <svg viewBox="0 0 1000 520" role="img" aria-label={`${template.name}, red premade para ${template.stations.length} nodos`}>
        <g className="network-rings" aria-hidden="true"><circle cx="500" cy="260" r="90" /><circle cx="500" cy="260" r="175" /><circle cx="500" cy="260" r="255" /></g>
        <g className="network-lines">{template.lines.map(line => <g key={line.name}><path className="network-line-shadow" d={line.path} /><path d={line.path} stroke={line.color} /></g>)}</g>
        <g className="network-stations">
          {template.stations.map((station, index) => {
            const edge = station.x > 820
            return <g className={`network-station ${station.role ?? ''}`} transform={`translate(${station.x} ${station.y})`} key={index}>
              {station.role === 'goal' && <circle className="goal-burst" r="22" />}
              <circle className="station-shell" r={station.role === 'interchange' ? 14 : station.role ? 12 : 9} />
              <circle className="station-core" r={station.role === 'interchange' ? 6 : 4} />
              <text className="station-number" y="-16">{String(index + 1).padStart(2, '0')}</text>
              {station.role && station.role !== 'interchange' && <text className="station-role" x={edge ? -19 : 19} y="5" textAnchor={edge ? 'end' : 'start'}>{roleLabel[station.role]}</text>}
            </g>
          })}
        </g>
      </svg>
      <footer>{template.lines.map(line => <span key={line.name}><i style={{ background: line.color }} />{line.name}</span>)}<span className="transfer-key"><b />Transbordo</span></footer>
    </article>
  )
}

export default function MapsGallery() {
  return (
    <main className="maps-gallery">
      <header className="maps-header">
        <a href="/"><ArrowLeft size={16} /> Volver</a>
        <div className="maps-kicker"><MapPinned size={17} /> Network pattern library · 03</div>
        <h1>Redes listas<br />para aprender.</h1>
        <p>Diez topologías basadas en relaciones de prerrequisito reales. Cada línea agrupa una progresión temática; los transbordos son conceptos bisagra y todos los recorridos desembocan en la meta.</p>
      </header>
      <section className="route-template-grid" aria-label="Plantillas de redes de aprendizaje">{mapTemplates.map(template => <RoutePreview template={template} key={template.code} />)}</section>
      <footer className="maps-footer"><span>YOUKNOW / NETWORK SYSTEM</span><span>16—24 STATIONS</span><span>ACYCLIC LEARNING ROUTES</span></footer>
    </main>
  )
}
