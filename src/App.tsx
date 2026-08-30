import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Flame,
  Library,
  Map,
  Play,
  Save,
  Send,
  Settings,
  Sparkles,
  Target,
  WandSparkles,
  X,
} from 'lucide-react'
import Brand from './Brand'
import LandingPage from './LandingPage'
import LearningMap from './LearningMap'
import { navigation, stations } from './mockData'

const navIcons = [Map, CalendarDays, Library, BarChart3, Sparkles, Settings]

type SourceType = 'topic' | 'text' | 'youtube' | 'pdf'
type AccountId = 'quantum' | 'explorer'
type Preferences = { sourceType: SourceType; topic: string; minutes: number; targetDate: string }
type LessonState = 'ready' | 'active' | 'completed' | 'reviewing'
type Notice = { kind: 'success' | 'error'; text: string }
type PlanConcept = { id: string; name: string; description: string; estimated_minutes: number; category: 'foundation' | 'core' | 'advanced' | 'application'; level: number }
type StudySession = { date: string; concept_id: string; duration_minutes: number }
type Plan = {
  id: string
  title: string
  generation_mode?: 'ai' | 'curated' | 'structural'
  concepts: PlanConcept[]
  edges: { from: string; to: string }[]
  schedule: StudySession[]
  statistics: { concept_count: number; total_minutes: number; total_sessions: number; estimated_completion_date: string }
}

const planKey = 'metro-plan'
const completedKey = 'metro-completed-sessions'
const preferencesKey = 'metro-preferences'
const activeAccountKey = 'metro-active-account'
const accounts = {
  quantum: { name: 'Alex Morgan', initials: 'AM', detail: 'Quantum demo' },
  explorer: { name: 'Maya Chen', initials: 'MC', detail: 'Empty route' },
} as const
const accountKey = (key: string, account: AccountId) => `${key}:${account}`
const sessionKey = (session: StudySession) => `${session.date}:${session.concept_id}`

const defaultPreferences = (account: AccountId): Preferences => ({
  sourceType: 'topic',
  topic: account === 'quantum' ? 'Quantum Computing' : '',
  minutes: 30,
  targetDate: new Date(Date.now() + 24 * 864e5).toISOString().slice(0, 10),
})

function readStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

const formatDate = (value: string) => new Intl.DateTimeFormat('en', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
}).format(new Date(`${value}T00:00:00Z`))

const formatMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`
const categoryRoute = { foundation: 'blue', core: 'green', advanced: 'purple', application: 'orange' } as const

function LessonTimer({ active, minutes }: { active: boolean; minutes: number }) {
  const [remaining, setRemaining] = useState(minutes * 60)

  useEffect(() => {
    setRemaining(minutes * 60)
    if (!active) return
    const interval = window.setInterval(() => setRemaining(seconds => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(interval)
  }, [active, minutes])

  if (!active) return null
  const time = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
  return <div role="timer" aria-label="Lesson time remaining" className="mt-4 flex items-center justify-center gap-2 rounded-[6px] border border-[#2b5eaa] bg-[#0d2340] py-2 text-[#8db8ff]"><Clock3 size={15} /><time className="font-mono text-[18px] font-semibold tabular-nums">{time}</time><span className="text-[9px] font-semibold uppercase tracking-[.1em]">remaining</span></div>
}

function Sidebar({ active, account, onAccountChange, onNavigate }: { active: string; account: AccountId; onAccountChange: (account: AccountId) => void; onNavigate: (item: string) => void }) {
  const profile = accounts[account]
  return (
    <aside className="sidebar flex min-h-0 flex-col border-r border-[#213044] bg-[#06111f]">
      <Brand />
      <nav className="mt-5 flex-1 px-3" aria-label="Primary navigation">
        {navigation.map((item, index) => {
          const Icon = navIcons[index]
          const selected = active === item
          return (
            <button
              type="button"
              key={item}
              onClick={() => onNavigate(item)}
              aria-current={selected ? 'page' : undefined}
              className={`nav-item mb-2 flex h-[52px] w-full items-center gap-4 rounded-[8px] px-4 text-left text-[13px] ${selected ? 'active text-white' : 'text-[#abb5c4]'}`}
            >
              <Icon size={21} strokeWidth={1.7} />
              <span>{item}</span>
            </button>
          )
        })}
      </nav>

      <div className="streak-card mx-4 mb-3 rounded-[10px] border border-[#263548] bg-[#091523] p-4">
        <div className="flex items-center gap-3">
          <Flame className="text-[#f5f8fc]" size={25} />
          <div><div className="text-[17px] font-semibold text-white">{account === 'quantum' ? 12 : 0}</div><div className="text-[11px] text-muted">Day streak</div></div>
        </div>
        <div className="mt-4 flex gap-1.5">
          {(account === 'quantum' ? [1, 1, 1, 1, 1, 0, 0] : [0, 0, 0, 0, 0, 0, 0]).map((filled, index) => <span key={index} className={`h-1.5 flex-1 rounded-sm ${filled ? 'bg-cobalt' : 'bg-[#23334a]'}`} />)}
        </div>
      </div>

      <div className="account-switcher mx-4 mb-3" role="group" aria-label="Demo accounts">
        {(Object.keys(accounts) as AccountId[]).map(id => <button type="button" key={id} aria-pressed={account === id} onClick={() => onAccountChange(id)}><span>{accounts[id].initials}</span><span><strong>{accounts[id].name}</strong><small>{accounts[id].detail}</small></span>{account === id && <Check size={13} />}</button>)}
      </div>

      <button type="button" onClick={() => onNavigate('Settings')} className="user-card mx-4 mb-4 flex items-center gap-3 border-t border-[#1c2b3e] pt-4 text-left">
        <span className="grid h-9 w-9 place-items-center rounded-full border border-[#36455a] bg-[#172437] text-xs font-semibold text-white">{profile.initials}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-[#e7edf5]">{profile.name}</span><span className="block text-[10px] text-muted">{profile.detail}</span></span>
        <ChevronRight size={14} className="text-muted" />
      </button>
    </aside>
  )
}

const generationStages = ['Reading your destination', 'Finding essential concepts', 'Connecting prerequisites', 'Scheduling your route']

function RouteGeneration({ topic }: { topic: string }) {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => setStage(current => Math.min(generationStages.length - 1, current + 1)), 700)
    return () => window.clearInterval(interval)
  }, [])

  return <div className="generation-screen" role="status" aria-live="polite" aria-label="Generating learning route">
    <section className="generation-panel">
      <header><div><span className="live-dot" />ROUTE CONTROL / LIVE</div><small>ML–{String(stage + 1).padStart(2, '0')}</small></header>
      <div className="generation-copy"><p>Destination analysis</p><h2>Building the line to<br /><span>{topic || 'your new subject'}</span></h2></div>
      <div className="generation-rail" aria-hidden="true">
        <svg viewBox="0 0 760 230">
          <path className="generation-track-shadow" d="M28 170 H175 L244 101 H390 L459 170 H732" />
          <path className="generation-track" pathLength="1" d="M28 170 H175 L244 101 H390 L459 170 H732" />
          {[{ x: 52, y: 170 }, { x: 175, y: 170 }, { x: 244, y: 101 }, { x: 390, y: 101 }, { x: 459, y: 170 }, { x: 704, y: 170 }].map((stop, index) => <g className={index <= stage + 1 ? 'generation-stop reached' : 'generation-stop'} key={stop.x} transform={`translate(${stop.x} ${stop.y})`}><circle r="12" /><circle r="4" /></g>)}
          <g className="generation-train"><rect x="-28" y="-14" width="56" height="28" rx="7" /><path d="M-15 14v7m30-7v7" /><circle cx="-16" cy="22" r="4" /><circle cx="16" cy="22" r="4" /><rect x="-15" y="-7" width="12" height="8" rx="2" /><rect x="3" y="-7" width="12" height="8" rx="2" /></g>
        </svg>
      </div>
      <div className="generation-status">
        <ol>{generationStages.map((label, index) => <li className={index < stage ? 'done' : index === stage ? 'active' : ''} key={label}><span>{index < stage ? <Check size={12} /> : String(index + 1).padStart(2, '0')}</span><strong>{label}</strong><small>{index < stage ? 'Cleared' : index === stage ? 'In progress' : 'Waiting'}</small></li>)}</ol>
        <div className="generation-progress"><span style={{ transform: `scaleX(${(stage + 1) / generationStages.length})` }} /></div>
      </div>
    </section>
  </div>
}

function Control({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`control block ${wide ? 'topic-control' : ''}`}><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[.1em] text-[#8793a5]">{label}</span>{children}</label>
}

function TopControls({ preferences, sourceFile, onChange, onFileChange, onGenerate, generating }: {
  preferences: Preferences
  sourceFile: File | null
  onChange: (preferences: Preferences) => void
  onFileChange: (file: File | null) => void
  onGenerate: () => void
  generating: boolean
}) {
  const labels = { topic: 'What do you want to learn?', text: 'Paste text or notes', youtube: 'YouTube URL', pdf: 'PDF document' }
  const placeholders = { topic: 'e.g. Urban beekeeping', text: 'Paste the source material here', youtube: 'https://youtube.com/watch?v=…', pdf: '' }
  const hasSource = preferences.sourceType === 'pdf' ? !!sourceFile : !!preferences.topic.trim()
  return (
    <header className="top-controls flex h-[78px] items-center gap-4">
      <Control label="Learn from"><select aria-label="Learning source" className="control-field" value={preferences.sourceType} onChange={event => { onFileChange(null); onChange({ ...preferences, sourceType: event.target.value as SourceType, topic: '' }) }}><option value="topic">A topic</option><option value="text">Pasted text</option><option value="youtube">YouTube</option><option value="pdf">A PDF</option></select></Control>
      <Control label={labels[preferences.sourceType]} wide>{preferences.sourceType === 'pdf' ? <input key={preferences.sourceType} aria-label="PDF source" className="control-field file-field" type="file" accept="application/pdf,.pdf" onChange={event => onFileChange(event.target.files?.[0] ?? null)} /> : <input aria-label="Learning source content" className="control-field" value={preferences.topic} placeholder={placeholders[preferences.sourceType]} onChange={event => onChange({ ...preferences, topic: event.target.value })} />}</Control>
      <div className="ml-auto flex items-end gap-3">
        <Control label="Time per day">
          <select className="control-field" value={preferences.minutes} onChange={event => onChange({ ...preferences, minutes: Number(event.target.value) })}>
            {[15, 30, 45, 60, 90].map(minutes => <option key={minutes} value={minutes}>{minutes} min / day</option>)}
          </select>
        </Control>
        <Control label="Goal date"><input className="control-field" type="date" min={new Date().toISOString().slice(0, 10)} required value={preferences.targetDate} onChange={event => onChange({ ...preferences, targetDate: event.target.value })} /></Control>
        <button type="button" onClick={onGenerate} disabled={generating || !hasSource || !preferences.targetDate} className="generate-button flex h-10 items-center gap-2 rounded-[7px] bg-[#1759dc] px-5 text-[12px] font-semibold text-white hover:bg-[#1d68f5]">
          <WandSparkles size={16} className={generating ? 'spin' : ''} /> {generating ? 'Generating…' : 'Generate Plan'}
        </button>
      </div>
    </header>
  )
}

function StudyOverview({ preferences, plan, currentConcept, currentSession, lessonState, progress, onLessonAction, onViewPlan }: {
  preferences: Preferences
  plan: Plan | null
  currentConcept: PlanConcept | null
  currentSession: StudySession | null
  lessonState: LessonState
  progress: number
  onLessonAction: () => void
  onViewPlan: () => void
}) {
  if (!plan && !preferences.topic) return <aside className="study-overview empty-overview overflow-hidden rounded-[10px] border border-line bg-panel"><section><span className="empty-platform">PLATFORM 00</span><CircleDot size={34} /><h2>No route on this account</h2><p>Choose a subject above. Metro will turn it into the concepts, dependencies, and sessions you need.</p></section></aside>
  const completed = lessonState === 'completed'
  const lessonLabel = lessonState === 'ready' ? 'Start Lesson' : lessonState === 'active' ? 'Complete Lesson' : lessonState === 'reviewing' ? 'Finish Review' : 'Review Lesson'
  return (
    <aside className="study-overview overflow-hidden rounded-[10px] border border-line bg-panel">
      <section className="border-b border-[#263448] p-5">
        <div className="flex items-center justify-between"><p className="section-label text-[#dfe5ed]">Today's lesson</p><button type="button" onClick={onViewPlan} className="plan-link text-[10px] text-[#4d8fff] underline underline-offset-2">View Plan</button></div>
        <div className="mt-5 flex items-center gap-3">
          <div className={`lesson-icon grid h-12 w-12 shrink-0 place-items-center rounded-full border text-white ${completed ? 'border-[#35b879] bg-[#18855a]' : 'border-[#2a70e5] bg-[#1252c8]'}`}><CircleDot size={21} /></div>
          <div><p className="text-[13px] font-semibold text-[#f3f6fa]">{currentConcept?.name ?? 'Quantum Algorithms'}</p><p className="mt-1 text-[11px] text-muted">{currentConcept?.description ?? 'Entanglement & Superposition'}</p><p className="mt-1 text-[11px] text-muted">{currentSession?.duration_minutes ?? preferences.minutes} min</p></div>
        </div>
        <LessonTimer active={lessonState === 'active' || lessonState === 'reviewing'} minutes={currentSession?.duration_minutes ?? preferences.minutes} />
        <button type="button" onClick={onLessonAction} className="lesson-button mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-[#175edc] text-[11px] font-semibold text-white">
          {lessonLabel} {lessonState === 'active' || lessonState === 'reviewing' ? <Check size={13} /> : <Play size={13} fill="currentColor" />}
        </button>
      </section>

      <section className="border-b border-[#263448] p-5">
        <p className="section-label text-[#dfe5ed]">Target milestone</p>
        <div className="mt-5 flex items-center gap-3"><Target size={42} className="shrink-0 text-[#9850da]" /><div><p className="text-[12px] font-semibold text-[#f1f4f8]">{plan?.title ?? 'Quantum Algorithms'}</p><p className="mt-1 text-[10px] text-muted">Est. Completion</p><p className="mt-1 text-[11px] font-semibold text-[#a866e5]">{formatDate(plan?.statistics.estimated_completion_date ?? preferences.targetDate)}</p></div></div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-sm bg-[#1b2a3d]"><span className="milestone-progress block h-full bg-[#1f70f4]" style={{ width: `${progress}%` }} /></div>
        <p className="mt-2 text-[10px] text-[#9ca7b7]">{progress}% of path completed</p>
      </section>

      <section className="p-5">
        <p className="section-label text-[#dfe5ed]">Total study time</p>
        <div className="mt-5 flex items-start"><Clock3 size={20} className="mr-3 mt-1 text-muted" /><div><p className="text-[20px] font-medium text-[#f1f4f8]">{plan ? formatMinutes(plan.statistics.total_minutes) : '46h 30m'}</p><p className="text-[10px] text-muted">Total Hours</p></div><div className="ml-auto border-l border-[#263448] pl-4"><p className="text-[10px] text-muted">Avg. / Day</p><p className="mt-1 text-[17px] font-medium text-[#f1f4f8]">{preferences.minutes} min</p></div></div>
        <div className="study-bars mt-4 flex h-12 items-end justify-between gap-3">
          {[16, 31, 44, 35, 27, 21, 0].map((height, index) => <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"><span className={`w-3 rounded-t-sm ${index === 3 ? 'bg-[#2478ff]' : 'bg-[#173467]'}`} style={{ height }} /><small className={index === 3 ? 'text-[#6da4ff]' : 'text-muted'}>{['S','M','T','W','T','F','S'][index]}</small></div>)}
        </div>
      </section>
    </aside>
  )
}

function WeeklyCalendar({ schedule, completedSessions }: { schedule?: StudySession[]; completedSessions?: string[] }) {
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - today.getDay())
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const iso = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
    return { day: date.toLocaleDateString('en', { weekday: 'short' }).toUpperCase(), date: date.getDate(), iso, current: date.toDateString() === today.toDateString() }
  })
  const completedSet = new Set(completedSessions)
  const weekSessions = schedule?.filter(session => week.some(day => day.iso === session.date)) ?? []
  const completed = weekSessions.filter(session => completedSet.has(sessionKey(session))).length
  const total = weekSessions.length
  const statuses = schedule ? week.map(day => {
    const sessions = weekSessions.filter(session => session.date === day.iso)
    return sessions.length && sessions.every(session => completedSet.has(sessionKey(session))) ? 'done' : day.current ? 'current' : 'empty'
  }) : week.map(day => day.current ? 'current' : 'empty')
  return (
    <section className="weekly-calendar overflow-hidden rounded-[10px] border border-line bg-panel" aria-label="Weekly plan">
      <div className="calendar-strip grid h-full grid-cols-[minmax(0,1fr)_210px]">
        <div className="grid grid-cols-7">
          {week.map((day, index) => <div key={day.day} aria-current={day.current ? 'date' : undefined} className={`calendar-day flex flex-col items-center justify-center text-center ${day.current ? 'current' : ''}`}><span className="date-number text-[42px] font-medium leading-none text-[#d9dee7]">{day.date}</span><span className="weekday mt-2 text-[11px] font-medium tracking-[.06em] text-[#9ba5b4]">{day.day}</span><span className={`status-dot mt-3 grid h-6 w-6 place-items-center rounded-full border ${statuses[index] === 'done' ? 'border-[#2775e8] bg-[#1461d6] text-white' : statuses[index] === 'current' ? 'border-[#75a6ff] bg-[#e9c40f]' : 'border-[#aeb7c5]'}`}>{statuses[index] === 'done' && <Check size={12} strokeWidth={2.5} />}</span></div>)}
        </div>
        <div className="calendar-summary flex items-center border-l border-[#263448] px-4"><div className="w-full">
          <div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#a7b3c5]">This week</p><span className="text-[9px] font-semibold text-[#5d9cff]">{total ? Math.round(completed / total * 100) : 0}%</span></div>
          <div className="mt-3 grid grid-cols-2 divide-x divide-[#2a394d]"><div className="pr-3"><strong className="block text-[22px] font-semibold leading-none text-white">{completed}<span className="text-[13px] font-medium text-muted"> / {total}</span></strong><span className="mt-2 block text-[8px] font-semibold uppercase tracking-[.08em] text-muted">Completed</span></div><div className="pl-3"><strong className="block text-[20px] font-semibold leading-none text-white">{formatMinutes(weekSessions.reduce((sum, session) => sum + session.duration_minutes, 0))}</strong><span className="mt-2 block text-[8px] font-semibold uppercase tracking-[.08em] text-muted">Planned</span></div></div>
          <div className="mt-4 grid grid-cols-7 gap-1" aria-label={`${completed} of ${total} lessons completed`}>{week.map((day, index) => <span key={day.day} className={`h-1 rounded-sm ${statuses[index] === 'done' ? 'bg-[#2478ff]' : 'bg-[#223249]'}`} />)}</div>
        </div></div>
      </div>
    </section>
  )
}

function CoachView({ plan, currentConcept }: { plan: Plan | null; currentConcept: PlanConcept | null }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(plan ? 'Ask about a concept or what to study next.' : 'Generate a plan first so I can answer from your real learning route.')
  const ask = (event: FormEvent) => {
    event.preventDefault()
    if (!plan) return setAnswer('Generate a plan first so I can inspect its concepts and prerequisites.')
    const words = question.toLowerCase().split(/\W+/).filter(word => word.length > 3)
    const ranked = plan.concepts.map(concept => ({ concept, score: words.filter(word => concept.name.toLowerCase().includes(word)).length })).sort((a, b) => b.score - a.score)
    const match = ranked[0]?.score ? ranked[0].concept : undefined
    const prerequisites = match && plan.edges.filter(edge => edge.to === match.id).map(edge => plan.concepts.find(concept => concept.id === edge.from)?.name).filter(Boolean)
    setAnswer(match
      ? `${match.name}: ${match.description}${prerequisites?.length ? ` Prerequisites: ${prerequisites.join(', ')}.` : ' It has no prerequisites in this plan.'}`
      : currentConcept ? `Your next stop is ${currentConcept.name}: ${currentConcept.description}` : 'You completed every scheduled session in this plan.')
    setQuestion('')
  }
  return (
    <section className="workspace-card coach-card"><p className="section-label">AI Coach</p><h1>Ask your learning path.</h1><p className="workspace-copy">{answer}</p><form onSubmit={ask} className="coach-form"><input aria-label="Question for AI Coach" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Where should I start with qubits?" required /><button type="submit"><Send size={15} /> Ask Coach</button></form></section>
  )
}

function SettingsView({ onSaved }: { onSaved: () => void }) {
  const [dailyReminder, setDailyReminder] = useState(() => localStorage.getItem('metro-daily-reminder') !== 'false')
  const [weeklySummary, setWeeklySummary] = useState(() => localStorage.getItem('metro-weekly-summary') !== 'false')
  const save = (event: FormEvent) => {
    event.preventDefault()
    localStorage.setItem('metro-daily-reminder', String(dailyReminder))
    localStorage.setItem('metro-weekly-summary', String(weeklySummary))
    onSaved()
  }
  return (
    <section className="workspace-card settings-card"><p className="section-label">Settings</p><h1>Learning preferences</h1><form onSubmit={save}><label><span><strong>Daily reminder</strong><small>Get a reminder before your planned session.</small></span><input type="checkbox" checked={dailyReminder} onChange={event => setDailyReminder(event.target.checked)} /></label><label><span><strong>Weekly summary</strong><small>Receive a progress recap at the end of each week.</small></span><input type="checkbox" checked={weeklySummary} onChange={event => setWeeklySummary(event.target.checked)} /></label><button type="submit"><Save size={15} /> Save Settings</button></form></section>
  )
}

function WorkspaceView({ active, demoAccount, preferences, plan, currentConcept, currentSession, completedSessions, lessonState, progress, onLessonAction, onViewPlan, onOpenConcept, onStartSession, onNavigate, onNotice }: {
  active: string
  demoAccount: boolean
  preferences: Preferences
  plan: Plan | null
  currentConcept: PlanConcept | null
  currentSession: StudySession | null
  completedSessions: string[]
  lessonState: LessonState
  progress: number
  onLessonAction: () => void
  onViewPlan: () => void
  onOpenConcept: (concept: PlanConcept) => void
  onStartSession: (session: StudySession) => void
  onNavigate: (item: string) => void
  onNotice: (notice: Notice) => void
}) {
  const upcoming = plan?.schedule.filter(session => !completedSessions.includes(sessionKey(session))).slice(0, 8)
  const concepts = plan?.concepts ?? (demoAccount ? stations.map((station, index) => ({ id: String(index), name: station.label, description: '', estimated_minutes: preferences.minutes, category: ({ blue: 'foundation', green: 'core', purple: 'advanced', orange: 'application' } as const)[station.route], level: 0 })) : [])

  if (active === 'Study Plan') return <div className="workspace-view study-plan-view"><section className="workspace-card session-card"><p className="section-label">Upcoming sessions</p><h1>Your next stops</h1><p className="workspace-copy">Choose any stop to start that lesson.</p><div className="session-list">{(upcoming ?? concepts.slice(15, 21).map(concept => ({ date: '', concept_id: concept.id, duration_minutes: preferences.minutes }))).map((session, index) => <button type="button" onClick={() => onStartSession(session)} key={`${session.date}-${session.concept_id}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><strong>{concepts.find(concept => concept.id === session.concept_id)?.name}</strong><small>{session.date ? `${formatDate(session.date)} · ` : ''}{session.duration_minutes} min <Play size={10} /></small></button>)}</div>{upcoming?.length === 0 && <p className="workspace-copy">All scheduled sessions are complete.</p>}</section><WeeklyCalendar schedule={plan?.schedule} completedSessions={completedSessions} /></div>

  if (active === 'Library') return <section className="workspace-card library-view"><p className="section-label">Concept library</p><h1>{plan?.title ?? preferences.topic}</h1><p className="workspace-copy">Every concept in your route, grouped by metro line. Select one to locate it on the map.</p><div className="concept-grid">{concepts.map(concept => <button type="button" onClick={() => onOpenConcept(concept)} key={concept.id} title={concept.description}><i className={`route-dot ${categoryRoute[concept.category]}`} /><span>{concept.name}</span><small>{concept.category} · {concept.estimated_minutes} min <ChevronRight size={10} /></small></button>)}</div></section>

  if (active === 'Progress') {
    const totalSessions = plan?.schedule.length ?? concepts.length
    const hasRoute = totalSessions > 0
    const completedCount = plan ? completedSessions.length : Math.round(totalSessions * progress / 100)
    const completedConcepts = new Set(plan ? plan.schedule.filter(session => completedSessions.includes(sessionKey(session))).map(session => session.concept_id) : concepts.slice(0, completedCount).map(concept => concept.id))
    const studiedMinutes = plan ? plan.schedule.filter(session => completedSessions.includes(sessionKey(session))).reduce((sum, session) => sum + session.duration_minutes, 0) : completedCount * preferences.minutes
    const routeProgress = (['foundation', 'core', 'advanced', 'application'] as const).map(category => {
      const routeConcepts = concepts.filter(concept => concept.category === category)
      const done = routeConcepts.filter(concept => completedConcepts.has(concept.id)).length
      return { category, label: { foundation: 'Foundations', core: 'Core concepts', advanced: 'Advanced topics', application: 'Applications' }[category], done, total: routeConcepts.length, percent: routeConcepts.length ? Math.round(done / routeConcepts.length * 100) : 0 }
    })
    const actionLabel = !hasRoute ? 'Set up your route' : lessonState === 'completed' ? 'Review last lesson' : lessonState === 'reviewing' ? 'Finish review' : lessonState === 'active' ? 'Complete lesson' : 'Start next lesson'

    return <section className="workspace-card progress-dashboard">
      <header className="progress-header">
        <div><p className="section-label">Progress overview</p><h1>{plan?.title ?? preferences.topic}</h1><p className="workspace-copy">A clear view of what you have covered and where to go next.</p></div>
        <span className="progress-status"><i />{!hasRoute ? 'No route yet' : progress === 100 ? 'Route complete' : lessonState === 'active' || lessonState === 'reviewing' ? 'Session active' : `${Math.max(0, totalSessions - completedCount)} stops left`}</span>
      </header>

      <div className="progress-grid">
        <article className="progress-hero">
          <div className="progress-ring" role="progressbar" aria-label="Overall learning progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{ background: `conic-gradient(#2e80ff ${progress * 3.6}deg, #17263a 0deg)` }}><div><strong>{progress}%</strong><span>complete</span></div></div>
          <div className="progress-hero-copy"><p className="section-label">Your route</p><h2>{hasRoute ? `${completedCount} of ${totalSessions} lessons cleared` : 'No lessons scheduled yet'}</h2><p>{!hasRoute ? 'Choose a topic above and generate a plan to start tracking meaningful progress.' : progress === 100 ? 'You reached the end of this route. Review any lesson to keep it fresh.' : `${Math.max(0, totalSessions - completedCount)} lessons remain before you reach your goal.`}</p><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>
        </article>

        <div className="progress-metrics" aria-label="Progress metrics">
          <article><span>Lessons done</span><strong>{completedCount}<small> / {totalSessions}</small></strong></article>
          <article><span>Time invested</span><strong>{formatMinutes(studiedMinutes)}</strong></article>
          <article><span>Remaining</span><strong>{Math.max(0, totalSessions - completedCount)}<small> lessons</small></strong></article>
          <article><span>Goal date</span><strong className="metric-date">{formatDate(plan?.statistics.estimated_completion_date ?? preferences.targetDate)}</strong></article>
        </div>

        <article className="progress-panel route-breakdown">
          <div className="progress-panel-heading"><div><p className="section-label">Route coverage</p><h2>Progress by stage</h2></div><span>{completedConcepts.size} concepts covered</span></div>
          <div className="route-progress-list">{routeProgress.map(route => <div className="route-progress-row" key={route.category}><i className={`route-dot ${categoryRoute[route.category]}`} /><span>{route.label}</span><div><i className={`route-progress-fill ${categoryRoute[route.category]}`} style={{ width: `${route.percent}%` }} /></div><strong>{route.done}/{route.total}</strong></div>)}</div>
        </article>

        <article className="progress-panel next-progress-stop">
          <p className="section-label">{!hasRoute ? 'Build your route' : progress === 100 ? 'Keep it fresh' : 'Next stop'}</p>
          <h2>{currentConcept?.name ?? (hasRoute ? 'Choose your next lesson' : 'Create your first learning plan')}</h2>
          <p>{currentConcept?.description || 'Generate a learning route to get a personalized next step.'}</p>
          <div className="next-stop-meta"><span><Clock3 size={14} />{currentSession?.duration_minutes ?? preferences.minutes} min</span><span><Target size={14} />{formatDate(plan?.statistics.estimated_completion_date ?? preferences.targetDate)}</span></div>
          <button type="button" onClick={() => { onLessonAction(); onNavigate('Learning Map') }}>{actionLabel}<Play size={13} fill="currentColor" /></button>
        </article>
      </div>
    </section>
  }

  if (active === 'AI Coach') return <CoachView plan={plan} currentConcept={currentConcept} />
  return <SettingsView onSaved={() => onNotice({ kind: 'success', text: 'Settings saved on this device.' })} />
}

function Dashboard() {
  const [account, setAccount] = useState<AccountId>(() => readStored(activeAccountKey, 'explorer'))
  const [activeNav, setActiveNav] = useState('Learning Map')
  const [preferences, setPreferences] = useState<Preferences>(() => readStored(accountKey(preferencesKey, account), defaultPreferences(account)))
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [plan, setPlan] = useState<Plan | null>(() => readStored(accountKey(planKey, account), null))
  const [completedSessions, setCompletedSessions] = useState<string[]>(() => readStored(accountKey(completedKey, account), []))
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [focusedConceptId, setFocusedConceptId] = useState<string | undefined>()
  const [demoLessonState, setDemoLessonState] = useState<LessonState>('ready')
  const [generating, setGenerating] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const currentSession = useMemo(() => plan?.schedule.find(session => sessionKey(session) === activeSession) ?? plan?.schedule.find(session => !completedSessions.includes(sessionKey(session))) ?? plan?.schedule[plan.schedule.length - 1] ?? null, [plan, completedSessions, activeSession])
  const currentConcept = plan?.concepts.find(concept => concept.id === currentSession?.concept_id) ?? null
  const lessonState: LessonState = plan ? (!currentSession ? 'completed' : activeSession === sessionKey(currentSession) ? completedSessions.includes(activeSession) ? 'reviewing' : 'active' : completedSessions.includes(sessionKey(currentSession)) ? 'completed' : 'ready') : demoLessonState
  const progress = plan ? plan.schedule.length ? Math.round(completedSessions.length / plan.schedule.length * 100) : 0 : account === 'quantum' ? demoLessonState === 'completed' ? 72 : 68 : 0

  const switchAccount = (next: AccountId) => {
    if (next === account) return
    setAccount(next)
    localStorage.setItem(activeAccountKey, JSON.stringify(next))
    setPreferences(readStored(accountKey(preferencesKey, next), defaultPreferences(next)))
    setPlan(readStored(accountKey(planKey, next), null))
    setCompletedSessions(readStored(accountKey(completedKey, next), []))
    setSourceFile(null)
    setActiveSession(null)
    setFocusedConceptId(undefined)
    setDemoLessonState('ready')
    setActiveNav('Learning Map')
    setNotice({ kind: 'success', text: next === 'quantum' ? 'Quantum demo account loaded.' : 'Empty Explorer account loaded. Choose a topic to begin.' })
  }

  const changePreferences = (next: Preferences) => {
    setPreferences(next)
    localStorage.setItem(accountKey(preferencesKey, account), JSON.stringify(next))
  }

  const openConcept = (concept: PlanConcept) => {
    setFocusedConceptId(plan ? concept.id : undefined)
    setActiveNav('Learning Map')
    if (!plan) setNotice({ kind: 'success', text: 'Generate your plan to focus individual stations.' })
  }

  const startSession = (session: StudySession) => {
    setActiveNav('Learning Map')
    if (!plan) {
      setDemoLessonState('active')
      setNotice({ kind: 'success', text: 'Demo lesson started. Your timer is running.' })
      return
    }
    setFocusedConceptId(session.concept_id)
    setActiveSession(sessionKey(session))
    setNotice({ kind: 'success', text: `${plan.concepts.find(concept => concept.id === session.concept_id)?.name ?? 'Lesson'} started.` })
  }

  const generatePlan = async () => {
    setGenerating(true)
    setNotice(null)
    try {
      const studyPreferences = { minutes_per_day: preferences.minutes, target_date: preferences.targetDate }
      let request: Promise<Response>
      if (preferences.sourceType === 'pdf') {
        const form = new FormData()
        form.append('file', sourceFile!)
        form.append('preferences', JSON.stringify(studyPreferences))
        request = fetch('/api/plans/generate-file', { method: 'POST', body: form })
      } else {
        request = fetch('/api/plans/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: { type: preferences.sourceType, value: preferences.topic }, preferences: studyPreferences }),
        })
      }
      const [response] = await Promise.all([request, new Promise(resolve => window.setTimeout(resolve, 2800))])
      const body = await response.json().catch(() => ({})) as Plan & { detail?: string }
      if (!response.ok) throw new Error(body.detail ?? 'Plan generation failed. Is the API running?')
      setPlan(body)
      localStorage.setItem(accountKey(planKey, account), JSON.stringify(body))
      setCompletedSessions([])
      localStorage.removeItem(accountKey(completedKey, account))
      setActiveSession(null)
      setFocusedConceptId(body.schedule[0]?.concept_id)
      setNotice({ kind: 'success', text: body.generation_mode === 'structural' ? `Draft route ready with ${body.statistics.concept_count} stations. Connect OpenAI or Ollama for subject-specific analysis.` : `Custom route ready with ${body.statistics.concept_count} necessary stations.` })
      setActiveNav('Learning Map')
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not generate the plan.' })
    } finally {
      setGenerating(false)
    }
  }

  const handleLesson = () => {
    if (!plan) {
      if (account === 'explorer') {
        setNotice({ kind: 'success', text: 'Choose a topic before starting your first lesson.' })
        return
      }
      const next = demoLessonState === 'ready' ? 'active' : demoLessonState === 'active' ? 'completed' : 'active'
      setDemoLessonState(next)
      setNotice({ kind: 'success', text: next === 'completed' ? 'Lesson completed. Progress updated.' : 'Lesson started. Your timer is running.' })
      return
    }
    if (!currentSession) {
      setNotice({ kind: 'success', text: 'Every scheduled session is complete.' })
    } else if (activeSession !== sessionKey(currentSession)) {
      setActiveSession(sessionKey(currentSession))
      setFocusedConceptId(currentSession.concept_id)
      setNotice({ kind: 'success', text: completedSessions.includes(sessionKey(currentSession)) ? 'Review started. Your timer is running.' : 'Lesson started. Your timer is running.' })
    } else {
      if (completedSessions.includes(sessionKey(currentSession))) {
        setActiveSession(null)
        setNotice({ kind: 'success', text: 'Review completed.' })
        return
      }
      const next = [...completedSessions, sessionKey(currentSession)]
      setCompletedSessions(next)
      localStorage.setItem(accountKey(completedKey, account), JSON.stringify(next))
      setActiveSession(null)
      setFocusedConceptId(undefined)
      setNotice({ kind: 'success', text: 'Lesson completed. Progress updated.' })
    }
  }

  return (
    <div className="app-shell min-h-screen bg-ink text-white">
      <Sidebar active={activeNav} account={account} onAccountChange={switchAccount} onNavigate={setActiveNav} />
      <main className="main-column min-w-0 px-5 pb-5">
        <TopControls preferences={preferences} sourceFile={sourceFile} onChange={changePreferences} onFileChange={setSourceFile} onGenerate={generatePlan} generating={generating} />
        {activeNav === 'Learning Map' ? <div className="dashboard-grid min-h-0"><LearningMap title={(plan?.title ?? preferences.topic) || 'Your learning route'} concepts={plan?.concepts} edges={plan?.edges} currentConceptId={focusedConceptId ?? currentConcept?.id} empty={!plan && account === 'explorer'} /><StudyOverview preferences={preferences} plan={plan} currentConcept={currentConcept} currentSession={currentSession} lessonState={lessonState} progress={progress} onLessonAction={handleLesson} onViewPlan={() => setActiveNav('Study Plan')} /><WeeklyCalendar schedule={plan?.schedule} completedSessions={completedSessions} /></div> : <WorkspaceView active={activeNav} demoAccount={account === 'quantum'} preferences={preferences} plan={plan} currentConcept={currentConcept} currentSession={currentSession} completedSessions={completedSessions} lessonState={lessonState} progress={progress} onLessonAction={handleLesson} onViewPlan={() => setActiveNav('Study Plan')} onOpenConcept={openConcept} onStartSession={startSession} onNavigate={setActiveNav} onNotice={setNotice} />}
      </main>
      {generating && <RouteGeneration topic={preferences.topic} />}
      {notice && <div className={`dashboard-notice ${notice.kind}`} role="status"><span>{notice.text}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={14} /></button></div>}
    </div>
  )
}

export default function App() {
  const [entered, setEntered] = useState(false)
  return (
    <div className="app-view-transition t-page-slide" data-page={entered ? '2' : '1'}>
      <section className="t-page" data-page-id="1" aria-hidden={entered} ref={element => { element?.toggleAttribute('inert', entered) }}><LandingPage onEnter={() => setEntered(true)} /></section>
      <section className="t-page" data-page-id="2" aria-hidden={!entered} ref={element => { element?.toggleAttribute('inert', !entered) }}><Dashboard /></section>
      <i className="page-rail" aria-hidden="true" />
    </div>
  )
}
