import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ArrowDown, ArrowRight } from 'lucide-react'
import Brand from './Brand'

const stops = [
  { id: 'central', number: '01', short: 'Origin', title: 'Learn anything. Without getting lost.', copy: 'YouKnow turns a huge topic into a clear route: what to learn, in what order, and how far to move each day.', color: '#3b82f6', position: [520, 110] },
  { id: 'entrada', number: '02', short: 'Topic', title: 'Tell us where you want to go.', copy: 'Enter a topic, paste a source, or set a goal. You do not need to prepare a syllabus before you begin.', color: '#f04f3d', position: [330, 110] },
  { id: 'conexiones', number: '03', short: 'Route', title: 'Start with what you need to know.', copy: 'YouKnow finds the prerequisites and connects every concept. See the full journey before taking the first step.', color: '#b56cff', position: [220, 220] },
  { id: 'ritmo', number: '04', short: 'Pace', title: 'A plan that actually fits your day.', copy: 'Set the time you have each day. Your route calculates when you will master the topic and recalculates as your pace changes.', color: '#ffb52e', position: [220, 480] },
  { id: 'progreso', number: '05', short: 'Progress', title: 'Always know where you are.', copy: 'Move forward one station at a time. The line makes it clear what you have mastered and what comes next.', color: '#29c58a', position: [400, 660] },
  { id: 'destino', number: '06', short: 'Destination', title: 'Your next line starts today.', copy: 'Choose a topic. YouKnow handles the order. You only need to reach the next stop.', color: '#ff5b94', position: [580, 660] },
] as const

const route = '650,-45 650,20 520,110 330,110 220,220 220,480 400,660 580,660 580,790 470,900 470,950'
const minorStations = [[585,65], [425,110], [275,165], [220,307], [220,393], [310,570], [490,660], [580,725], [580,790], [525,845]] as const

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sections = root.current?.querySelectorAll<HTMLElement>('.landing-stop')
    if (!sections?.length) return
    const observer = new IntersectionObserver(entries => {
      const visible = entries.find(entry => entry.isIntersecting)
      if (visible) setActive(Number((visible.target as HTMLElement).dataset.index))
    }, { root: root.current, threshold: 0.55 })
    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  const goTo = (index: number) => root.current?.querySelector(`#${stops[index].id}`)?.scrollIntoView()
  const current = stops[active]
  const [trainX, trainY] = current.position

  return (
    <div
      ref={root}
      className="landing"
      style={{
        '--accent': current.color,
        '--train-x': `${trainX}px`,
        '--train-y': `${trainY}px`,
      } as CSSProperties}
    >
      <header className="landing-header">
        <Brand compact />
        <div className="landing-header-meta">
          <span>{current.number} — {current.short}</span>
          <button className="motion-arrow" onClick={onEnter}>Open planner <span><ArrowRight size={14} /></span></button>
        </div>
      </header>

      <aside className="metro-stage" aria-hidden="true">
        <div className="route-wordmark">YOUKNOW / LEARNING LINE</div>
        <svg viewBox="0 0 720 900" preserveAspectRatio="xMidYMid meet">
          <polyline className="route-track" points={route} pathLength="1" />

          <g className="minor-stations">
            {minorStations.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="7" />)}
          </g>

          {stops.map((stop, index) => {
            const [x, y] = stop.position
            return (
              <g key={stop.id} className={`route-station ${index === active ? 'active' : ''}`} style={{ '--station-color': stop.color } as CSSProperties}>
                <circle className="station-pulse" cx={x} cy={y} r="24" />
                <circle className="station-halo" cx={x} cy={y} r="54" />
                <circle className="station-ring" cx={x} cy={y} r="16" />
                <circle className="station-core" cx={x} cy={y} r="6" />
              </g>
            )
          })}

          <g className="route-train">
            <circle r="27" />
            <circle r="9" />
          </g>
        </svg>
      </aside>

      <main className="landing-journey">
        {stops.map((stop, index) => (
          <section id={stop.id} data-index={index} data-active={index === active || undefined} className="landing-stop" key={stop.id}>
            <div className={`landing-copy ${index === active ? 'is-shown' : 'is-hiding'}`}>
              <h1 className="reveal-line">{stop.title}</h1>
              <p className="reveal-line">{stop.copy}</p>
              {index === 0 && (
                <div className="landing-actions reveal-line">
                  <button onClick={() => goTo(1)}>See how it works <ArrowDown size={15} /></button>
                  <button className="text-button" onClick={onEnter}>Open dashboard</button>
                </div>
              )}
              {index === stops.length - 1 && <button className="final-cta motion-arrow reveal-line" onClick={onEnter}>Create my route <span><ArrowRight size={17} /></span></button>}
            </div>
            {index < stops.length - 1 && <button className="next-stop" onClick={() => goTo(index + 1)}><span>Next stop</span><ArrowDown size={15} /></button>}
          </section>
        ))}
      </main>
    </div>
  )
}
