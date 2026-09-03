import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import {
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Flame,
  Library,
  Map,
  Pause,
  Play,
  Plus,
  Send,
  Settings,
  Sparkles,
  Target,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react'
import Brand from './Brand'
import LandingPage from './LandingPage'
import LearningMap from './LearningMap'
import MapsGallery from './MapsGallery'
import { navigation, stations } from './mockData'

const navIcons = [Map, Library, BarChart3, Sparkles, Settings]

type SourceType = 'topic' | 'text' | 'youtube' | 'pdf'
type AIProvider = 'openai' | 'qwen' | 'groq' | 'gemini' | 'openrouter'
type AccountId = string
type Profile = { id: AccountId; name: string; initials: string; detail: string; starterTopic: string; streak: number; streakWeek: number[] }
type ColorTheme = 'pink' | 'blue'
type NodeLabelStyle = 'smart' | 'metro'
const themeKey = 'youknow-color-theme'
const backgroundKey = 'youknow-background-color'
const nodeLabelStyleKey = 'youknow-node-label-style'
const themeBackground = { pink: '#ff4f88', blue: '#2596be' } as const
const defaultModel: Record<AIProvider, string> = {
  openai: 'gpt-5-mini',
  qwen: 'qwen-plus',
  groq: 'openai/gpt-oss-20b',
  gemini: 'gemini-3.7-flash',
  openrouter: 'openrouter/free',
}
const suggestedModels: Record<AIProvider, readonly string[]> = {
  openai: ['gpt-5-mini'],
  qwen: ['qwen-plus', 'qwen-flash', 'qwen3-coder-plus'],
  groq: ['openai/gpt-oss-20b'],
  gemini: ['gemini-3.7-flash'],
  openrouter: ['openrouter/free'],
}
type Preferences = { topic: string; minutes: number; targetDate: string }
type LessonState = 'ready' | 'active' | 'completed' | 'reviewing'
type Notice = { kind: 'success' | 'error'; text: string }
type PlanConcept = { id: string; name: string; description: string; estimated_minutes: number; category: 'foundation' | 'core' | 'advanced' | 'application'; level: number }
type StudySession = { date: string; concept_id: string; duration_minutes: number }
type PlanLine = { id: string; name: string; description: string; concept_ids: string[] }
type Plan = {
  id: string
  title: string
  goal_concept_id?: string
  generation_mode?: 'ai' | 'curated' | 'structural'
  concepts: PlanConcept[]
  edges: { from: string; to: string }[]
  lines?: PlanLine[]
  schedule: StudySession[]
  statistics: { concept_count: number; total_minutes: number; total_sessions: number; estimated_completion_date: string }
}
type SourceCard = { id: string; conceptId?: string; label: string; kind: SourceType; addedAt: string }
type LineExpansion = {
  destination: string
  generation_mode: 'ai' | 'structural'
  concepts: PlanConcept[]
  edges: { from: string; to: string }[]
  lines: PlanLine[]
  connector_concept_ids: string[]
  schedule: StudySession[]
}

const planKey = 'metro-plan'
const completedKey = 'metro-completed-sessions'
const knownKey = 'metro-known-concepts'
const preferencesKey = 'metro-preferences'
const notesKey = 'metro-notes'
const sourcesKey = 'metro-sources'
const profilesKey = 'metro-profiles'
const removedProfileId = 'explorer'
const defaultProfiles: Profile[] = [
  { id: 'quantum', name: 'Alex Morgan', initials: 'AM', detail: 'Quantum route', starterTopic: 'Quantum Computing', streak: 12, streakWeek: [1, 1, 1, 1, 1, 0, 0] },
]
const accountKey = (key: string, account: AccountId) => `${key}:${account}`
const sessionKey = (session: StudySession) => `${session.date}:${session.concept_id}`

const defaultPreferences = (account: AccountId, profiles = defaultProfiles): Preferences => ({
  topic: profiles.find(profile => profile.id === account)?.starterTopic ?? '',
  minutes: 30,
  targetDate: '',
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
const completionDate = (plan: Plan | null) => plan ? formatDate(plan.statistics.estimated_completion_date) : 'Calculated after generation'

const formatMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`
const categoryRoute = { foundation: 'blue', core: 'green', advanced: 'purple', application: 'orange' } as const
const routeCategory = { blue: 'foundation', green: 'core', purple: 'advanced', orange: 'application' } as const
const presetConcept = (station: (typeof stations)[number]): PlanConcept => ({ id: station.label, name: station.label, description: `Understand ${station.label} and how it connects to the wider Quantum Computing path.`, estimated_minutes: 30, category: routeCategory[station.route], level: 0 })

const atmosphereStars = [
  [6, 16, 0], [14, 72, 1.2], [24, 34, .4], [33, 88, 2], [42, 12, 1.5],
  [55, 67, .8], [64, 24, 2.4], [73, 83, .2], [81, 42, 1.7], [91, 18, .9],
  [96, 74, 2.1], [48, 48, 1.1], [8, 94, 2.7], [88, 94, .6],
] as const

function PixelAtmosphere() {
  return <div className="pixel-atmosphere" aria-hidden="true">{atmosphereStars.map(([left, top, delay], index) => <i key={index} className="pixel-star" style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` }} />)}</div>
}

function LessonTimer({ active, minutes }: { active: boolean; minutes: number }) {
  const [remaining, setRemaining] = useState(minutes * 60)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    setRemaining(minutes * 60)
    setPaused(false)
  }, [active, minutes])

  useEffect(() => {
    if (!active || paused) return
    const interval = window.setInterval(() => setRemaining(seconds => {
      if (seconds <= 1) window.clearInterval(interval)
      return Math.max(0, seconds - 1)
    }), 1000)
    return () => window.clearInterval(interval)
  }, [active, paused])

  if (!active) return null
  const time = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
  return <div role="timer" aria-label="Lesson time remaining" className="lesson-timer mt-4"><Clock3 size={15} /><div><time>{time}</time><span>{paused ? 'paused' : 'remaining'}</span></div><button type="button" aria-label={paused ? 'Resume timer' : 'Pause timer'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}{paused ? 'Resume' : 'Pause'}</button></div>
}

function Sidebar({ active, account, profiles, onAccountChange, onCreateProfile, onDeleteProfile, onNavigate }: { active: string; account: AccountId; profiles: Profile[]; onAccountChange: (account: AccountId) => void; onCreateProfile: (name: string) => void; onDeleteProfile: (profile: Profile) => void; onNavigate: (item: string) => void }) {
  const profile = profiles.find(item => item.id === account) ?? profiles[0]
  const [creatingProfile, setCreatingProfile] = useState(false)
  const [profileName, setProfileName] = useState('')
  const createProfile = (event: FormEvent) => {
    event.preventDefault()
    const name = profileName.trim()
    if (!name) return
    onCreateProfile(name)
    setProfileName('')
    setCreatingProfile(false)
  }
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
          <div><div className="text-[17px] font-semibold text-white">{profile.streak}</div><div className="text-[11px] text-muted">Day streak</div></div>
        </div>
        <div className="mt-4 flex gap-1.5">
          {profile.streakWeek.map((filled, index) => <span key={index} className={`h-1.5 flex-1 rounded-sm ${filled ? 'bg-cobalt' : 'bg-[#23334a]'}`} />)}
        </div>
      </div>

      <div className="account-switcher mx-4 mb-3" role="group" aria-label="Learning profiles">
        {profiles.map(item => <div className="profile-row" key={item.id}><button type="button" aria-pressed={account === item.id} onClick={() => onAccountChange(item.id)}><span>{item.initials}</span><span><strong>{item.name}</strong><small>{item.detail}</small></span>{account === item.id && <Check size={13} />}</button>{!defaultProfiles.some(profile => profile.id === item.id) && <button type="button" className="delete-profile-button" aria-label={`Delete ${item.name} profile`} title="Delete profile" onClick={() => onDeleteProfile(item)}><Trash2 size={13} /></button>}</div>)}
        <button type="button" className="new-profile-button" aria-expanded={creatingProfile} onClick={() => setCreatingProfile(true)}><span><Plus size={13} /></span><span><strong>New profile</strong><small>Create a separate route</small></span></button>
      </div>

      <button type="button" onClick={() => onNavigate('Settings')} className="user-card mx-4 mb-4 flex items-center gap-3 border-t border-[#1c2b3e] pt-4 text-left">
        <span className="grid h-9 w-9 place-items-center rounded-full border border-[#36455a] bg-[#172437] text-xs font-semibold text-white">{profile.initials}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-[#e7edf5]">{profile.name}</span><span className="block text-[10px] text-muted">{profile.detail}</span></span>
        <ChevronRight size={14} className="text-muted" />
      </button>
      {creatingProfile && <div className="profile-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setCreatingProfile(false) }}><section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" onKeyDown={event => { if (event.key === 'Escape') setCreatingProfile(false) }}><header><span>PROFILE / NEW</span><button type="button" aria-label="Close profile creator" onClick={() => setCreatingProfile(false)}><X size={16} /></button></header><form onSubmit={createProfile}><p className="section-label">Your own line</p><h2 id="profile-dialog-title">Create a learning profile.</h2><label><span>Name</span><input autoFocus aria-label="Profile name" value={profileName} onChange={event => setProfileName(event.target.value)} placeholder="e.g. Sam Rivera" maxLength={40} required /></label><button type="submit"><Plus size={15} /> Create profile</button></form></section></div>}
    </aside>
  )
}

const generationStages = ['Reading your destination', 'Finding essential concepts', 'Connecting prerequisites', 'Scheduling your route']
const expansionStages = ['Inspecting the selected stop', 'Tracing earlier prerequisites', 'Laying the new track', 'Opening previous stops']

function RouteGeneration({ topic, expanding = false }: { topic: string; expanding?: boolean }) {
  const [stage, setStage] = useState(0)
  const stages = expanding ? expansionStages : generationStages

  useEffect(() => {
    const interval = window.setInterval(() => setStage(current => Math.min(stages.length - 1, current + 1)), 700)
    return () => window.clearInterval(interval)
  }, [stages.length])

  return <div className="generation-screen" role="status" aria-live="polite" aria-label={expanding ? 'Extending learning line' : 'Generating learning route'}>
    <section className="generation-panel">
      <header><div><span className="live-dot" />ROUTE CONTROL / LIVE</div><small>ML–{String(stage + 1).padStart(2, '0')}</small></header>
      <div className="generation-copy"><p>{expanding ? 'Track extension' : 'Destination analysis'}</p><h2>{expanding ? 'Extending the line behind' : 'Building the line to'}<br /><span>{topic || 'your new subject'}</span></h2></div>
      <div className="generation-rail" aria-hidden="true">
        <svg viewBox="0 0 760 230">
          <path className="generation-track-shadow" d="M28 170 H175 L244 101 H390 L459 170 H732" />
          <path className="generation-track" pathLength="1" d="M28 170 H175 L244 101 H390 L459 170 H732" />
          {[{ x: 52, y: 170 }, { x: 175, y: 170 }, { x: 244, y: 101 }, { x: 390, y: 101 }, { x: 459, y: 170 }, { x: 704, y: 170 }].map((stop, index) => <g className={index <= stage + 1 ? 'generation-stop reached' : 'generation-stop'} key={stop.x} transform={`translate(${stop.x} ${stop.y})`}><circle r="12" /><circle r="4" /></g>)}
          <g className="generation-train"><rect x="-28" y="-14" width="56" height="28" rx="7" /><path d="M-15 14v7m30-7v7" /><circle cx="-16" cy="22" r="4" /><circle cx="16" cy="22" r="4" /><rect x="-15" y="-7" width="12" height="8" rx="2" /><rect x="3" y="-7" width="12" height="8" rx="2" /></g>
        </svg>
      </div>
      <div className="generation-status">
        <ol>{stages.map((label, index) => <li className={index < stage ? 'done' : index === stage ? 'active' : ''} key={label}><span>{index < stage ? <Check size={12} /> : String(index + 1).padStart(2, '0')}</span><strong>{label}</strong><small>{index < stage ? 'Cleared' : index === stage ? 'In progress' : 'Waiting'}</small></li>)}</ol>
        <div className="generation-progress"><span style={{ transform: `scaleX(${(stage + 1) / stages.length})` }} /></div>
      </div>
    </section>
  </div>
}

function Control({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`control block ${wide ? 'topic-control' : ''}`}><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[.1em] text-[#8793a5]">{label}</span>{children}</label>
}

function TopControls({ preferences, provider, model, apiKey, onChange, onProviderChange, onModelChange, onApiKeyChange, onGenerate, generating }: {
  preferences: Preferences
  provider: AIProvider
  model: string
  apiKey: string
  onChange: (preferences: Preferences) => void
  onProviderChange: (provider: AIProvider) => void
  onModelChange: (model: string) => void
  onApiKeyChange: (apiKey: string) => void
  onGenerate: () => void
  generating: boolean
}) {
  const hasTitle = !!preferences.topic.trim()
  return (
    <form className="top-controls flex h-[78px] items-center gap-4" onSubmit={event => { event.preventDefault(); if (hasTitle && !generating) onGenerate() }}>
      <Control label="What do you want to learn?" wide><input aria-label="Learning title" className="control-field" value={preferences.topic} placeholder="e.g. Urban beekeeping" maxLength={200} onChange={event => onChange({ ...preferences, topic: event.target.value })} /></Control>
      <div className="control ai-credentials"><span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[.1em] text-[#8793a5]">AI provider / model / API key{apiKey && <i>ready</i>}</span><div><select aria-label="AI provider" value={provider} onChange={event => onProviderChange(event.target.value as AIProvider)}><option value="openai">OpenAI</option><option value="qwen">Qwen</option><option value="groq">Groq</option><option value="gemini">Gemini</option><option value="openrouter">OpenRouter</option></select><input aria-label="AI model" value={model} list="ai-models" spellCheck={false} title="Model ID sent to the selected provider." onChange={event => onModelChange(event.target.value)} /><datalist id="ai-models">{suggestedModels[provider].map(candidate => <option key={candidate} value={candidate} />)}</datalist><input aria-label="AI API key" type="password" value={apiKey} autoComplete="off" spellCheck={false} placeholder="API key · not saved" title="Used only for this tab and sent to your backend." onChange={event => onApiKeyChange(event.target.value)} /></div></div>
      <div className="ml-auto flex items-end gap-3">
        <Control label="Time per day">
          <select className="control-field" value={preferences.minutes} onChange={event => onChange({ ...preferences, minutes: Number(event.target.value) })}>
            {[15, 30, 45, 60, 90].map(minutes => <option key={minutes} value={minutes}>{minutes} min / day</option>)}
          </select>
        </Control>
        <Control label="Deadline (optional)"><input className="control-field" type="date" min={new Date().toISOString().slice(0, 10)} value={preferences.targetDate} onChange={event => onChange({ ...preferences, targetDate: event.target.value })} /></Control>
        <button type="submit" disabled={generating || !hasTitle} className="generate-button flex h-10 items-center gap-2 rounded-[7px] bg-[#1759dc] px-5 text-[12px] font-semibold text-white hover:bg-[#1d68f5]">
          <WandSparkles size={16} className={generating ? 'spin' : ''} /> {generating ? 'Generating…' : 'Generate Plan'}
        </button>
      </div>
    </form>
  )
}

function StudyOverview({ preferences, plan, currentConcept, currentSession, lessonState, progress, empty = false, onLessonAction }: {
  preferences: Preferences
  plan: Plan | null
  currentConcept: PlanConcept | null
  currentSession: StudySession | null
  lessonState: LessonState
  progress: number
  empty?: boolean
  onLessonAction: () => void
}) {
  const completed = lessonState === 'completed'
  const lessonLabel = lessonState === 'ready' ? 'Start Lesson' : lessonState === 'active' ? 'Complete Lesson' : lessonState === 'reviewing' ? 'Finish Review' : 'Review Lesson'
  const routeTitle = (plan?.title ?? preferences.topic) || 'Your learning route'
  const totalMinutes = plan?.statistics.total_minutes ?? (empty ? 0 : stations.length * preferences.minutes)
  const dailyMinutes = plan?.schedule.reduce((days, session) => {
    days[new Date(`${session.date}T00:00:00Z`).getUTCDay()] += session.duration_minutes
    return days
  }, [0, 0, 0, 0, 0, 0, 0]) ?? [0, 0, 0, 0, 0, 0, 0]
  if (!plan && !empty) dailyMinutes[new Date().getDay()] = preferences.minutes
  const busiestDay = Math.max(...dailyMinutes, 1)
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return (
    <aside className="study-overview overflow-hidden rounded-[10px] border border-line bg-panel">
      <section className="border-b border-[#263448] p-5">
        <p className="section-label text-[#dfe5ed]">Today's lesson</p>
        <div className="mt-5 flex items-center gap-3">
          <div className={`lesson-icon grid h-12 w-12 shrink-0 place-items-center rounded-full border text-white ${completed ? 'border-[#35b879] bg-[#18855a]' : 'border-[#2a70e5] bg-[#1252c8]'}`}><CircleDot size={21} /></div>
          <div><p className="text-[13px] font-semibold text-[#f3f6fa]">{currentConcept?.name ?? (empty ? 'No lesson yet' : 'Quantum Algorithms')}</p><p className="mt-1 text-[11px] text-muted">{currentConcept?.description ?? (empty ? 'Create a route to schedule your first lesson.' : 'Entanglement & Superposition')}</p>{!empty && <p className="mt-1 text-[11px] text-muted">{currentSession?.duration_minutes ?? preferences.minutes} min</p>}</div>
        </div>
        <LessonTimer key={currentSession ? sessionKey(currentSession) : currentConcept?.id} active={lessonState === 'active' || lessonState === 'reviewing'} minutes={currentSession?.duration_minutes ?? preferences.minutes} />
        <button type="button" disabled={empty} onClick={onLessonAction} className="lesson-button mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-[#175edc] text-[11px] font-semibold text-white">
          {lessonLabel} {lessonState === 'active' || lessonState === 'reviewing' ? <Check size={13} /> : <Play size={13} fill="currentColor" />}
        </button>
      </section>

      <section className="border-b border-[#263448] p-5">
        <p className="section-label text-[#dfe5ed]">Target milestone</p>
        <div className="mt-5 flex items-center gap-3"><Target size={42} className="shrink-0 text-[#9850da]" /><div><p className="text-[12px] font-semibold text-[#f1f4f8]">{routeTitle}</p><p className="mt-1 text-[10px] text-muted">{plan ? 'Estimated completion' : 'Schedule'}</p><p className="mt-1 text-[11px] font-semibold text-[#a866e5]">{plan ? completionDate(plan) : preferences.targetDate ? formatDate(preferences.targetDate) : 'Self-paced route'}</p></div></div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-sm bg-[#1b2a3d]" role="progressbar" aria-label="Learning path progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span className="milestone-progress block h-full bg-[#1f70f4]" style={{ width: `${progress}%` }} /></div>
        <p className="mt-2 text-[10px] text-[#9ca7b7]">{progress}% of path completed</p>
      </section>

      <section className="p-5">
        <p className="section-label text-[#dfe5ed]">Planned study time</p>
        <div className="mt-5 flex items-start"><Clock3 size={20} className="mr-3 mt-1 text-muted" /><div><p className="text-[20px] font-medium text-[#f1f4f8]">{formatMinutes(totalMinutes)}</p><p className="text-[10px] text-muted">{plan ? 'Scheduled total' : 'Route estimate'}</p></div><div className="ml-auto border-l border-[#263448] pl-4"><p className="text-[10px] text-muted">Per session</p><p className="mt-1 text-[17px] font-medium text-[#f1f4f8]">{preferences.minutes} min</p></div></div>
        <div className="study-bars mt-4 flex h-12 items-end justify-between gap-3">
          {dailyMinutes.map((minutes, index) => <span className="study-bar" aria-label={`${dayLabels[index]}: ${minutes} planned minutes`} title={`${dayLabels[index]} · ${minutes} min`} key={dayLabels[index]}><span className={`study-bar-fill ${index === new Date().getDay() ? 'bg-[#2478ff]' : 'bg-[#173467]'}`} style={{ height: Math.max(3, Math.round(minutes / busiestDay * 36)) }} /><small className={index === new Date().getDay() ? 'text-[#6da4ff]' : 'text-muted'}>{dayLabels[index][0]}</small></span>)}
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

function SettingsView({ theme, background, nodeLabelStyle, onThemeChange, onBackgroundChange, onNodeLabelStyleChange }: { theme: ColorTheme; background: string; nodeLabelStyle: NodeLabelStyle; onThemeChange: (theme: ColorTheme) => void; onBackgroundChange: (background: string) => void; onNodeLabelStyleChange: (style: NodeLabelStyle) => void }) {
  return (
    <section className="workspace-card settings-card"><p className="section-label">Settings</p><h1>Customization</h1><div className="settings-options"><fieldset className="theme-picker"><legend>Color theme</legend><div>{([['pink', 'Pink', '#ff4f88'], ['blue', 'Blue', '#2596be']] as const).map(([value, label, color]) => <button type="button" key={value} aria-pressed={theme === value} onClick={() => onThemeChange(value)}><i style={{ background: color }} /><span><strong>{label}</strong><small>{color.toUpperCase()}</small></span><Check size={15} /></button>)}</div></fieldset><fieldset className="theme-picker label-style-picker"><legend>Node titles</legend><div>{([['smart', 'Smart labels', 'Collision-free cards'], ['metro', 'Metro labels', 'Outlined map text']] as const).map(([value, label, detail]) => <button type="button" key={value} aria-pressed={nodeLabelStyle === value} onClick={() => onNodeLabelStyleChange(value)}><i className={`label-style-icon ${value}`}>Aa</i><span><strong>{label}</strong><small>{detail}</small></span><Check size={15} /></button>)}</div></fieldset><label className="background-picker"><span><strong>Background</strong><small>Color behind the dashboard elements.</small></span><input type="color" aria-label="Dashboard background" value={background} onChange={event => onBackgroundChange(event.target.value)} /></label></div></section>
  )
}

function NodeNotebook({ concept, note, sources, onClose, onOpenMap, onSaveNote, onAddSource, onRemoveSource }: {
  concept: PlanConcept
  note: string
  sources: SourceCard[]
  onClose: () => void
  onOpenMap: () => void
  onSaveNote: (content: string) => void
  onAddSource: (label: string) => void
  onRemoveSource: (sourceId: string) => void
}) {
  const [draft, setDraft] = useState(note)
  const [sourceDraft, setSourceDraft] = useState('')
  useEffect(() => setDraft(note), [concept.id, note])
  return <section className="notebook-shelf node-notebook" aria-label={`Notes and sources for ${concept.name}`}>
    <header><div><p className="section-label">Node workspace</p><h2>{concept.name}</h2><p>Your notes and sources stay attached to this node.</p></div><div className="node-notebook-actions"><span className="notebook-count"><BookOpen size={15} />{note.trim() ? '1 note' : 'No notes'} · {sources.length} {sources.length === 1 ? 'source' : 'sources'}</span><button type="button" onClick={onOpenMap}><Map size={14} />See on map</button><button type="button" aria-label="Close node workspace" onClick={onClose}><X size={15} /></button></div></header>
    <div className="notebook-grid">
      <article className="big-notebook">
        <div className="notebook-spine" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className="notebook-paper">
          <div className="notebook-paper-head"><span>NODE NOTES</span><strong>{concept.name}</strong></div>
          <textarea autoFocus aria-label="Notes for selected lesson" value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') onSaveNote(draft) }} placeholder="Write the idea you want to remember…" />
          <footer><span>{draft === note ? (draft.trim() ? 'Saved' : 'Blank page') : 'Unsaved changes · ⌘ Enter'}</span><button type="button" onClick={() => onSaveNote(draft)} disabled={draft === note}>Save page</button></footer>
        </div>
      </article>
      <article className="source-notebook">
        <div className="postit-header"><span>PINBOARD</span><strong>Sources used</strong></div>
        <form onSubmit={event => { event.preventDefault(); if (!sourceDraft.trim()) return; onAddSource(sourceDraft.trim()); setSourceDraft('') }}><input aria-label="Source to save" value={sourceDraft} onChange={event => setSourceDraft(event.target.value)} placeholder="Paste a link, book, or file" /><button type="submit">Pin it</button></form>
        <div className="postit-list">{sources.length ? sources.map((source, index) => <div className="source-postit" key={source.id} style={{ '--postit-tilt': `${index % 2 ? 1 : -1}deg` } as CSSProperties}><span>{source.kind}</span><p>{source.label}</p><button type="button" aria-label={`Remove ${source.label}`} onClick={() => onRemoveSource(source.id)}><X size={12} /></button></div>) : <p className="source-empty">No sources pinned to this node yet.</p>}</div>
      </article>
    </div>
  </section>
}

function WorkspaceView({ active, theme, background, nodeLabelStyle, preferences, plan, starterRoute, currentConcept, currentSession, completedSessions, lessonState, progress, notes, sources, notebookConceptId, onLessonAction, onOpenConcept, onNavigate, onThemeChange, onBackgroundChange, onNodeLabelStyleChange, onNotice, onSelectNotebookConcept, onSaveNote, onAddSource, onRemoveSource }: {
  active: string
  theme: ColorTheme
  background: string
  nodeLabelStyle: NodeLabelStyle
  preferences: Preferences
  plan: Plan | null
  starterRoute: boolean
  currentConcept: PlanConcept | null
  currentSession: StudySession | null
  completedSessions: string[]
  lessonState: LessonState
  progress: number
  notes: Record<string, string>
  sources: SourceCard[]
  notebookConceptId?: string
  onLessonAction: () => void
  onOpenConcept: (concept: PlanConcept) => void
  onNavigate: (item: string) => void
  onThemeChange: (theme: ColorTheme) => void
  onBackgroundChange: (background: string) => void
  onNodeLabelStyleChange: (style: NodeLabelStyle) => void
  onNotice: (notice: Notice) => void
  onSelectNotebookConcept: (conceptId?: string) => void
  onSaveNote: (conceptId: string, content: string) => void
  onAddSource: (conceptId: string, label: string) => void
  onRemoveSource: (sourceId: string) => void
}) {
  const concepts = plan?.concepts ?? (starterRoute ? stations.map(presetConcept) : [])
  useEffect(() => {
    if (active !== 'Library' || !notebookConceptId) return
    const frame = requestAnimationFrame(() => [...document.querySelectorAll<HTMLElement>('[data-library-concept-id]')].find(element => element.dataset.libraryConceptId === notebookConceptId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    return () => cancelAnimationFrame(frame)
  }, [active, notebookConceptId])

  if (active === 'Library') {
    const stages = [
      { category: 'foundation', number: '01', label: 'Foundations', description: 'The ideas everything else depends on.' },
      { category: 'core', number: '02', label: 'Core concepts', description: 'The working language of the subject.' },
      { category: 'advanced', number: '03', label: 'Advanced', description: 'Deeper models and harder connections.' },
      { category: 'application', number: '04', label: 'Applications', description: 'Turn knowledge into practical skill.' },
    ] as const
    const featured = currentConcept ?? concepts[0]
    const totalMinutes = concepts.reduce((sum, concept) => sum + concept.estimated_minutes, 0)

    if (!featured) return <section className="workspace-card library-view library-empty"><Library size={34} /><p className="section-label">Concept library</p><h1>Your library starts with a route.</h1><p className="workspace-copy">Create a learning map and every concept will get its own notes and sources.</p><button type="button" onClick={() => onNavigate('Learning Map')}>Build my route <ChevronRight size={15} /></button></section>

    return <section className="workspace-card library-view">
      <header className="library-hero">
        <div><p className="section-label">Concept library</p><h1>{(plan?.title ?? preferences.topic) || 'Your learning route'}</h1><p>Open any node to write notes and pin the sources that belong to it.</p></div>
        <div className="library-summary" aria-label="Library summary"><span><strong>{concepts.length}</strong> concepts</span><span><strong>{formatMinutes(totalMinutes)}</strong> learning time</span></div>
      </header>

      <div className="library-composition">
        <button type="button" className={`library-feature ${categoryRoute[featured.category]}`} onClick={() => onOpenConcept(featured)}>
          <span className="library-feature-label"><i />Current focus</span>
          <div><small>{featured.category} · {featured.estimated_minutes} min</small><h2>{featured.name}</h2><p>{featured.description}</p></div>
          <span className="library-feature-action">Open on map <ChevronRight size={16} /></span>
        </button>

        <div className="library-stages">
          {stages.map(stage => {
            const stageConcepts = concepts.filter(concept => concept.category === stage.category)
            if (!stageConcepts.length) return null
            return <section className={`library-stage ${categoryRoute[stage.category]}`} key={stage.category}>
              <header><span>{stage.number}</span><div><h2>{stage.label}</h2><p>{stage.description}</p></div><strong>{stageConcepts.length}</strong></header>
              <div className="concept-grid">{stageConcepts.map((concept, index) => {
                const open = notebookConceptId === concept.id
                const conceptSources = sources.filter(source => source.conceptId === concept.id || (!source.conceptId && concept.id === concepts[0]?.id))
                return <article className={`concept-node ${open ? 'is-open' : ''}`} data-library-concept-id={concept.id} key={concept.id}>
                  <button type="button" className="concept-card" aria-expanded={open} onClick={() => onSelectNotebookConcept(open ? undefined : concept.id)} title={concept.description}><span className="concept-number">{String(index + 1).padStart(2, '0')}</span><div><strong>{concept.name}</strong><p>{concept.description}</p><small><i className={`route-dot ${categoryRoute[concept.category]}`} />{concept.estimated_minutes} min <span>{notes[concept.id]?.trim() ? 'Note saved' : 'Open notes'}</span><ChevronRight size={11} /></small></div></button>
                  {open && <NodeNotebook concept={concept} note={notes[concept.id] ?? ''} sources={conceptSources} onClose={() => onSelectNotebookConcept(undefined)} onOpenMap={() => onOpenConcept(concept)} onSaveNote={content => onSaveNote(concept.id, content)} onAddSource={label => onAddSource(concept.id, label)} onRemoveSource={onRemoveSource} />}
                </article>
              })}</div>
            </section>
          })}
        </div>
      </div>
    </section>
  }

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
        <div><p className="section-label">Progress overview</p><h1>{plan?.title || preferences.topic || 'Your learning progress'}</h1><p className="workspace-copy">A clear view of what you have covered and where to go next.</p></div>
        <span className="progress-status"><i />{!hasRoute ? 'No route yet' : progress === 100 ? 'Route complete' : lessonState === 'active' || lessonState === 'reviewing' ? 'Session active' : `${Math.max(0, totalSessions - completedCount)} stops left`}</span>
      </header>

      <div className="progress-grid">
        <article className="progress-hero">
          <div className="progress-ring" role="progressbar" aria-label="Overall learning progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{ background: `conic-gradient(var(--rose) ${progress * 3.6}deg, var(--progress-track) 0deg)` }}><div><strong>{progress}%</strong><span>complete</span></div></div>
          <div className="progress-hero-copy"><p className="section-label">Your route</p><h2>{hasRoute ? `${completedCount} of ${totalSessions} lessons cleared` : 'No lessons scheduled yet'}</h2><p>{!hasRoute ? 'Choose a topic above and generate a plan to start tracking meaningful progress.' : progress === 100 ? 'You reached the end of this route. Review any lesson to keep it fresh.' : `${Math.max(0, totalSessions - completedCount)} lessons remain before you reach your goal.`}</p><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="progress-status-summary" aria-label="Lesson progress summary"><span className="is-done"><i />{completedCount} done</span><span className="is-current"><i />{lessonState === 'active' || lessonState === 'reviewing' ? 'Now: ' : 'Next: '}{currentConcept?.name ?? 'Not started'}</span><span className="is-remaining"><i />{Math.max(0, totalSessions - completedCount)} left</span></div></div>
        </article>

        <div className="progress-metrics" aria-label="Progress metrics">
          <article><span>Lessons done</span><strong>{completedCount}<small> / {totalSessions}</small></strong></article>
          <article><span>Time invested</span><strong>{formatMinutes(studiedMinutes)}</strong></article>
          <article><span>Remaining</span><strong>{Math.max(0, totalSessions - completedCount)}<small> lessons</small></strong></article>
          <article><span>Estimated mastery</span><strong className="metric-date">{completionDate(plan)}</strong></article>
        </div>

        <article className="progress-panel route-breakdown">
          <div className="progress-panel-heading"><div><p className="section-label">Route coverage</p><h2>Progress by stage</h2></div><span>{completedConcepts.size} concepts covered</span></div>
          <div className="route-progress-list">{routeProgress.map(route => <div className="route-progress-row" key={route.category}><i className={`route-dot ${categoryRoute[route.category]}`} /><span>{route.label}</span><div><i className={`route-progress-fill ${categoryRoute[route.category]}`} style={{ width: `${route.percent}%` }} /></div><strong>{route.done}/{route.total}</strong></div>)}</div>
        </article>

        <article className="progress-panel next-progress-stop">
          <p className="section-label">{!hasRoute ? 'Build your route' : progress === 100 ? 'Keep it fresh' : 'Next stop'}</p>
          <h2>{currentConcept?.name ?? (hasRoute ? 'Choose your next lesson' : 'Create your first learning plan')}</h2>
          <p>{currentConcept?.description || 'Generate a learning route to get a personalized next step.'}</p>
          <button type="button" onClick={() => { onLessonAction(); onNavigate('Learning Map') }}>{actionLabel}<Play size={13} fill="currentColor" /></button>
        </article>
      </div>
    </section>
  }

  if (active === 'AI Coach') return <CoachView plan={plan} currentConcept={currentConcept} />
  return <SettingsView theme={theme} background={background} nodeLabelStyle={nodeLabelStyle} onThemeChange={onThemeChange} onBackgroundChange={onBackgroundChange} onNodeLabelStyleChange={onNodeLabelStyleChange} />
}

function Dashboard({ theme, background, onThemeChange, onBackgroundChange }: { theme: ColorTheme; background: string; onThemeChange: (theme: ColorTheme) => void; onBackgroundChange: (background: string) => void }) {
  const [profiles, setProfiles] = useState<Profile[]>(() => readStored<Profile[]>(profilesKey, defaultProfiles).filter(profile => profile.id !== removedProfileId))
  const [account, setAccount] = useState<AccountId>(defaultProfiles[0].id)
  const [activeNav, setActiveNav] = useState('Learning Map')
  const [preferences, setPreferences] = useState<Preferences>(() => readStored(accountKey(preferencesKey, account), defaultPreferences(account, profiles)))
  const [provider, setProvider] = useState<AIProvider>('openai')
  const [model, setModel] = useState(defaultModel.openai)
  const [apiKey, setApiKey] = useState('')
  const [plan, setPlan] = useState<Plan | null>(() => readStored(accountKey(planKey, account), null))
  const [completedSessions, setCompletedSessions] = useState<string[]>(() => readStored(accountKey(completedKey, account), []))
  const [knownConceptIds, setKnownConceptIds] = useState<string[]>(() => readStored(accountKey(knownKey, account), []))
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [focusedConceptId, setFocusedConceptId] = useState<string | undefined>()
  const [presetLessonState, setPresetLessonState] = useState<LessonState>('ready')
  const [generating, setGenerating] = useState(false)
  const [expandingTopic, setExpandingTopic] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>(() => readStored(accountKey(notesKey, account), {}))
  const [sources, setSources] = useState<SourceCard[]>(() => readStored(accountKey(sourcesKey, account), []))
  const [notebookConceptId, setNotebookConceptId] = useState<string | undefined>()
  const [nodeLabelStyle, setNodeLabelStyle] = useState<NodeLabelStyle>(() => localStorage.getItem(nodeLabelStyleKey) === 'metro' ? 'metro' : 'smart')

  useEffect(() => {
    localStorage.setItem(profilesKey, JSON.stringify(profiles))
    ;[planKey, completedKey, knownKey, preferencesKey, notesKey, sourcesKey].forEach(key => localStorage.removeItem(accountKey(key, removedProfileId)))
  }, [])

  const starterRoute = defaultProfiles.some(profile => profile.id === account)
  const currentSession = useMemo(() => plan?.schedule.find(session => sessionKey(session) === activeSession) ?? plan?.schedule.find(session => !completedSessions.includes(sessionKey(session))) ?? plan?.schedule[plan.schedule.length - 1] ?? null, [plan, completedSessions, activeSession])
  const selectedPresetStation = starterRoute ? stations.find(station => station.label === focusedConceptId) ?? stations.find(station => station.current) : undefined
  const currentConcept = plan?.concepts.find(concept => concept.id === currentSession?.concept_id) ?? (selectedPresetStation ? presetConcept(selectedPresetStation) : null)
  const lessonState: LessonState = plan ? (!currentSession ? 'completed' : activeSession === sessionKey(currentSession) ? completedSessions.includes(activeSession) ? 'reviewing' : 'active' : completedSessions.includes(sessionKey(currentSession)) ? 'completed' : 'ready') : presetLessonState
  const progress = plan ? plan.schedule.length ? Math.round(completedSessions.length / plan.schedule.length * 100) : 0 : presetLessonState === 'completed' ? Math.round(100 / stations.length) : 0
  const completedConceptIds = useMemo(() => plan?.concepts.filter(concept => {
    const sessions = plan.schedule.filter(session => session.concept_id === concept.id)
    return sessions.length > 0 && sessions.every(session => completedSessions.includes(sessionKey(session)))
  }).map(concept => concept.id) ?? [], [plan, completedSessions])

  const changeNodeLabelStyle = (next: NodeLabelStyle) => {
    setNodeLabelStyle(next)
    localStorage.setItem(nodeLabelStyleKey, next)
  }

  const switchAccount = (next: AccountId) => {
    if (next === account) return
    setAccount(next)
    setPreferences(readStored(accountKey(preferencesKey, next), defaultPreferences(next, profiles)))
    setPlan(readStored(accountKey(planKey, next), null))
    setCompletedSessions(readStored(accountKey(completedKey, next), []))
    setKnownConceptIds(readStored(accountKey(knownKey, next), []))
    setActiveSession(null)
    setFocusedConceptId(undefined)
    setPresetLessonState('ready')
    setNotes(readStored(accountKey(notesKey, next), {}))
    setSources(readStored(accountKey(sourcesKey, next), []))
    setNotebookConceptId(undefined)
    setActiveNav('Learning Map')
    setNotice({ kind: 'success', text: `${profiles.find(profile => profile.id === next)?.detail ?? 'Profile'} loaded.` })
  }

  const createProfile = (name: string) => {
    const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
    const profile: Profile = { id: crypto.randomUUID(), name, initials, detail: 'New route', starterTopic: '', streak: 0, streakWeek: [0, 0, 0, 0, 0, 0, 0] }
    const next = [...profiles, profile]
    setProfiles(next)
    localStorage.setItem(profilesKey, JSON.stringify(next))
    setAccount(profile.id)
    setPreferences(defaultPreferences(profile.id, next))
    setPlan(null)
    setCompletedSessions([])
    setKnownConceptIds([])
    setNotes({})
    setSources([])
    setActiveSession(null)
    setFocusedConceptId(undefined)
    setPresetLessonState('ready')
    setNotebookConceptId(undefined)
    setActiveNav('Learning Map')
    setNotice({ kind: 'success', text: `${name}'s profile is ready.` })
  }

  const deleteProfile = (profile: Profile) => {
    if (!window.confirm(`Delete ${profile.name}'s profile and all its learning data?`)) return
    const next = profiles.filter(item => item.id !== profile.id)
    setProfiles(next)
    localStorage.setItem(profilesKey, JSON.stringify(next))
    ;[planKey, completedKey, knownKey, preferencesKey, notesKey, sourcesKey].forEach(key => localStorage.removeItem(accountKey(key, profile.id)))
    if (profile.id === account) switchAccount(defaultProfiles[0].id)
    setNotice({ kind: 'success', text: `${profile.name}'s profile was deleted.` })
  }

  const changePreferences = (next: Preferences) => {
    setPreferences(next)
    localStorage.setItem(accountKey(preferencesKey, account), JSON.stringify(next))
  }

  const changeProvider = (next: AIProvider) => {
    setProvider(next)
    setModel(defaultModel[next])
  }

  const openNotebook = (conceptId: string) => {
    setNotebookConceptId(conceptId)
    setActiveNav('Library')
  }
  const saveNote = (conceptId: string, content: string) => {
    const next = { ...notes, [conceptId]: content }
    setNotes(next)
    localStorage.setItem(accountKey(notesKey, account), JSON.stringify(next))
    setNotice({ kind: 'success', text: 'Notebook page saved.' })
  }
  const addSource = (conceptId: string, label: string, kind: SourceType = 'text') => {
    const clean = label.trim()
    if (!clean || sources.some(source => source.conceptId === conceptId && source.label === clean)) return
    const next = [...sources, { id: `${Date.now()}-${sources.length}`, conceptId, label: clean, kind, addedAt: new Date().toISOString() }]
    setSources(next)
    localStorage.setItem(accountKey(sourcesKey, account), JSON.stringify(next))
    setNotice({ kind: 'success', text: 'Source pinned to this node.' })
  }
  const removeSource = (sourceId: string) => {
    const next = sources.filter(source => source.id !== sourceId)
    setSources(next)
    localStorage.setItem(accountKey(sourcesKey, account), JSON.stringify(next))
  }

  const openConcept = (concept: PlanConcept) => {
    setFocusedConceptId(concept.id)
    setActiveNav('Learning Map')
    if (!plan) setNotice({ kind: 'success', text: `${concept.name} focused on the learning map.` })
  }

  const startSession = (session: StudySession) => {
    setActiveNav('Learning Map')
    if (!plan) {
      setPresetLessonState('active')
      setNotice({ kind: 'success', text: 'Lesson started. Your timer is running.' })
      return
    }
    setFocusedConceptId(session.concept_id)
    setActiveSession(sessionKey(session))
    setNotice({ kind: 'success', text: `${plan.concepts.find(concept => concept.id === session.concept_id)?.name ?? 'Lesson'} started.` })
  }

  const startConcept = (conceptId: string) => {
    if (!plan) {
      setFocusedConceptId(conceptId)
      setPresetLessonState('active')
      setNotice({ kind: 'success', text: `${conceptId} started. Your timer is running.` })
      return
    }
    const sessions = plan.schedule.filter(session => session.concept_id === conceptId)
    const session = sessions.find(item => !completedSessions.includes(sessionKey(item))) ?? sessions[sessions.length - 1]
    if (session) startSession(session)
  }

  const toggleKnown = (conceptId: string) => {
    const next = knownConceptIds.includes(conceptId) ? knownConceptIds.filter(id => id !== conceptId) : [...knownConceptIds, conceptId]
    setKnownConceptIds(next)
    localStorage.setItem(accountKey(knownKey, account), JSON.stringify(next))
    setNotice({ kind: 'success', text: next.includes(conceptId) ? 'Marked as already known. Your planned hours are unchanged.' : 'Removed from already known.' })
  }

  const requestPlan = async (title: string) => {
    const studyPreferences = { minutes_per_day: preferences.minutes, target_date: preferences.targetDate || undefined }
    const headers: Record<string, string> = apiKey.trim() ? { 'X-LLM-API-Key': apiKey.trim(), 'X-LLM-Provider': provider, 'X-LLM-Model': model.trim() } : {}
    const request = fetch('/api/plans/generate', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, preferences: studyPreferences }),
    })
    const [response] = await Promise.all([request, new Promise(resolve => window.setTimeout(resolve, 2800))])
    const body = await response.json().catch(() => ({})) as Plan & { detail?: string }
    if (!response.ok) throw new Error(body.detail ?? 'Plan generation failed. Is the API running?')
    return body
  }

  const generatePlan = async () => {
    setGenerating(true)
    setExpandingTopic(null)
    setNotice(null)
    try {
      const body = await requestPlan(preferences.topic)
      setPlan(body)
      localStorage.setItem(accountKey(planKey, account), JSON.stringify(body))
      setCompletedSessions([])
      localStorage.removeItem(accountKey(completedKey, account))
      setKnownConceptIds([])
      localStorage.removeItem(accountKey(knownKey, account))
      setActiveSession(null)
      setFocusedConceptId(body.schedule[0]?.concept_id)
      setNotice({ kind: 'success', text: body.generation_mode === 'structural' ? `Draft route ready with ${body.statistics.concept_count} stations. Add an API key or start Ollama for subject-specific analysis.` : `Custom route ready with ${body.statistics.concept_count} necessary stations.` })
      setActiveNav('Learning Map')
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not generate the plan.' })
    } finally {
      setGenerating(false)
    }
  }

  const requestExpansion = async (destination: string) => {
    const request = fetch('/api/plans/expand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey.trim() && { 'X-LLM-API-Key': apiKey.trim(), 'X-LLM-Provider': provider, 'X-LLM-Model': model.trim() }) },
      body: JSON.stringify({
        destination,
        existing_concepts: plan?.concepts.map(concept => concept.name) ?? [],
        preferences: { minutes_per_day: preferences.minutes, target_date: preferences.targetDate || undefined },
      }),
    })
    const [response] = await Promise.all([request, new Promise(resolve => window.setTimeout(resolve, 2800))])
    const body = await response.json().catch(() => ({})) as LineExpansion & { detail?: string }
    if (!response.ok) throw new Error(body.detail ?? 'Line extension failed. Is the API running?')
    return body
  }

  const requestRequiredPath = async (destinationId: string, destination: string) => {
    const routeConcepts = plan?.concepts ?? stations.map(presetConcept)
    const routeEdges = plan?.edges ?? stations.flatMap((station, index) => {
      const previous = stations.slice(0, index).reverse().find(candidate => candidate.route === station.route)
      return previous ? [{ from: previous.label, to: station.label }] : []
    })
    const response = await fetch('/api/plans/required-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey.trim() && { 'X-LLM-API-Key': apiKey.trim(), 'X-LLM-Provider': provider, 'X-LLM-Model': model.trim() }) },
      body: JSON.stringify({ destination_id: destinationId, destination, concepts: routeConcepts.map(concept => ({ id: concept.id, name: concept.name })), edges: routeEdges }),
    })
    const body = await response.json().catch(() => ({})) as { concept_ids?: string[]; detail?: string }
    if (!response.ok || !body.concept_ids?.length) throw new Error(body.detail ?? 'Could not find the required path.')
    return body.concept_ids
  }

  const expandConcept = async (conceptId: string, conceptName: string) => {
    const prefix = `extension:${conceptId}:`
    if (plan?.concepts.some(concept => concept.id.startsWith(prefix))) {
      setNotice({ kind: 'success', text: 'This station already has an extended prerequisite line.' })
      return
    }
    setGenerating(true)
    setExpandingTopic(conceptName)
    setNotice(null)
    try {
      if (!plan) {
        const branch = await requestPlan(conceptName)
        setPlan(branch)
        localStorage.setItem(accountKey(planKey, account), JSON.stringify(branch))
        setCompletedSessions([])
        localStorage.removeItem(accountKey(completedKey, account))
        setKnownConceptIds([])
        localStorage.removeItem(accountKey(knownKey, account))
        setActiveSession(null)
        setFocusedConceptId(branch.schedule[0]?.concept_id)
        setNotice({ kind: 'success', text: `Detailed line ready with ${branch.statistics.concept_count} prerequisite stops.` })
        return
      }

      const branch = await requestExpansion(conceptName)
      if (!branch.concepts.length) {
        setNotice({ kind: 'success', text: 'This station already has every necessary prerequisite.' })
        return
      }
      const shift = Math.max(...branch.concepts.map(concept => concept.level), 0) + 1
      const addedConcepts = branch.concepts.map(concept => ({ ...concept, id: `${prefix}${concept.id}` }))
      const addedEdges = branch.edges.map(edge => ({ from: `${prefix}${edge.from}`, to: `${prefix}${edge.to}` }))
      const connectors = branch.connector_concept_ids.map(id => ({ from: `${prefix}${id}`, to: conceptId }))
      const addedSchedule = branch.schedule.map(session => ({ ...session, concept_id: `${prefix}${session.concept_id}` }))
      const addedLines = branch.lines.map(line => ({ ...line, id: `${prefix}line:${line.id}`, concept_ids: line.concept_ids.map(id => `${prefix}${id}`) }))
      const concepts = [...addedConcepts, ...plan.concepts.map(concept => ({ ...concept, level: concept.level + shift }))]
      const schedule = [...addedSchedule, ...plan.schedule]
      const updated: Plan = {
        ...plan,
        concepts,
        edges: [...addedEdges, ...connectors, ...plan.edges],
        lines: [...addedLines, ...(plan.lines ?? [])],
        schedule,
        statistics: {
          concept_count: concepts.length,
          total_minutes: concepts.reduce((sum, concept) => sum + concept.estimated_minutes, 0),
          total_sessions: schedule.length,
          estimated_completion_date: schedule.reduce((latest, session) => session.date > latest ? session.date : latest, plan.statistics.estimated_completion_date),
        },
      }
      setPlan(updated)
      localStorage.setItem(accountKey(planKey, account), JSON.stringify(updated))
      setActiveSession(null)
      setFocusedConceptId(conceptId)
      setNotice({ kind: 'success', text: `Added ${addedConcepts.length} necessary stops across ${addedLines.length} ${addedLines.length === 1 ? 'line' : 'lines'}: ${addedLines.map(line => line.name).join(', ')}.` })
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not extend the line.' })
    } finally {
      setGenerating(false)
      setExpandingTopic(null)
    }
  }

  const handleLesson = () => {
    if (!plan) {
      const next = presetLessonState === 'ready' ? 'active' : presetLessonState === 'active' ? 'completed' : 'active'
      setPresetLessonState(next)
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
    <div className="app-shell min-h-screen bg-ink text-white" data-theme={theme} style={{ '--background-color': background } as CSSProperties}>
      <PixelAtmosphere />
      <Sidebar active={activeNav} account={account} profiles={profiles} onAccountChange={switchAccount} onCreateProfile={createProfile} onDeleteProfile={deleteProfile} onNavigate={setActiveNav} />
      <main className="main-column min-w-0 px-5 pb-5">
        <TopControls preferences={preferences} provider={provider} model={model} apiKey={apiKey} onChange={changePreferences} onProviderChange={changeProvider} onModelChange={setModel} onApiKeyChange={setApiKey} onGenerate={generatePlan} generating={generating} />
        {activeNav === 'Learning Map' ? <div className="dashboard-grid min-h-0"><LearningMap title={(plan?.title ?? preferences.topic) || 'Your learning route'} concepts={plan?.concepts ?? (starterRoute ? undefined : [])} edges={plan?.edges} lines={plan?.lines} nodeLabelStyle={nodeLabelStyle} empty={!plan && !starterRoute} currentConceptId={focusedConceptId ?? currentConcept?.id} todayConceptId={currentSession?.concept_id ?? currentConcept?.id} goalConceptId={plan?.goal_concept_id ?? plan?.schedule?.[plan.schedule.length - 1]?.concept_id ?? (starterRoute ? stations[stations.length - 1]?.label : undefined)} knownConceptIds={knownConceptIds} completedConceptIds={completedConceptIds} canGenerate={!!preferences.topic.trim()} generating={generating} onGenerate={generatePlan} onStartConcept={startConcept} onExpandConcept={expandConcept} onOpenNotebook={openNotebook} onToggleKnown={toggleKnown} onRequestRequiredPath={requestRequiredPath} /><StudyOverview preferences={preferences} plan={plan} currentConcept={currentConcept} currentSession={currentSession} lessonState={lessonState} progress={progress} empty={!plan && !starterRoute} onLessonAction={handleLesson} /><WeeklyCalendar schedule={plan?.schedule} completedSessions={completedSessions} /></div> : <WorkspaceView active={activeNav} theme={theme} background={background} nodeLabelStyle={nodeLabelStyle} preferences={preferences} plan={plan} starterRoute={starterRoute} currentConcept={currentConcept} currentSession={currentSession} completedSessions={completedSessions} lessonState={lessonState} progress={progress} notes={notes} sources={sources} notebookConceptId={notebookConceptId} onLessonAction={handleLesson} onOpenConcept={openConcept} onNavigate={setActiveNav} onThemeChange={onThemeChange} onBackgroundChange={onBackgroundChange} onNodeLabelStyleChange={changeNodeLabelStyle} onNotice={setNotice} onSelectNotebookConcept={setNotebookConceptId} onSaveNote={saveNote} onAddSource={addSource} onRemoveSource={removeSource} />}
      </main>
      {generating && <RouteGeneration topic={expandingTopic ?? preferences.topic} expanding={!!expandingTopic} />}
      {notice && <div className={`dashboard-notice ${notice.kind}`} role="status"><span>{notice.text}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={14} /></button></div>}
    </div>
  )
}

function MainApp() {
  const [entered, setEntered] = useState(false)
  const [theme, setTheme] = useState<ColorTheme>(() => localStorage.getItem(themeKey) === 'blue' ? 'blue' : 'pink')
  const [background, setBackground] = useState(() => localStorage.getItem(backgroundKey) ?? themeBackground[theme])
  const changeTheme = (next: ColorTheme) => {
    setTheme(next)
    localStorage.setItem(themeKey, next)
    setBackground(themeBackground[next])
    localStorage.setItem(backgroundKey, themeBackground[next])
  }
  const changeBackground = (next: string) => {
    setBackground(next)
    localStorage.setItem(backgroundKey, next)
  }
  return (
    <div className="app-view-transition t-page-slide" data-page={entered ? '2' : '1'} data-theme={theme}>
      <section className="t-page" data-page-id="1" aria-hidden={entered} ref={element => { element?.toggleAttribute('inert', entered) }}><LandingPage onEnter={() => setEntered(true)} /></section>
      <section className="t-page" data-page-id="2" aria-hidden={!entered} ref={element => { element?.toggleAttribute('inert', !entered) }}><Dashboard theme={theme} background={background} onThemeChange={changeTheme} onBackgroundChange={changeBackground} /></section>
      <i className="page-rail" aria-hidden="true" />
    </div>
  )
}

export default function App() {
  return window.location.pathname === '/maps' ? <MapsGallery /> : <MainApp />
}
