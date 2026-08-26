import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Flame,
  Library,
  Map,
  Play,
  Settings,
  Sparkles,
  Target,
  WandSparkles,
} from 'lucide-react'
import LearningMap from './LearningMap'
import { navigation, week } from './mockData'

const navIcons = [Map, CalendarDays, Library, BarChart3, Sparkles, Settings]

function Logo() {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <svg width="41" height="40" viewBox="0 0 42 40" aria-hidden="true">
        <path d="M4 5v29M4 5l17 20M21 25L38 5M38 5v29" fill="none" stroke="#1769ff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 5l17 20L38 5" fill="none" stroke="#9cc4ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="brand-copy">
        <strong className="block text-[20px] font-bold tracking-[.08em] text-[#f2f5f9]">METRO</strong>
        <span className="block text-[10px] tracking-[.12em] text-muted">LEARNING PATH</span>
      </div>
    </div>
  )
}

function Sidebar() {
  return (
    <aside className="sidebar flex min-h-0 flex-col border-r border-[#213044] bg-[#06111f]">
      <Logo />
      <nav className="mt-5 flex-1 px-3" aria-label="Primary navigation">
        {navigation.map((item, index) => {
          const Icon = navIcons[index]
          const active = index === 0
          return (
            <button key={item} className={`nav-item mb-2 flex h-[52px] w-full items-center gap-4 rounded-[8px] px-4 text-left text-[13px] ${active ? 'active text-white' : 'text-[#abb5c4]'}`}>
              <Icon size={21} strokeWidth={1.7} />
              <span>{item}</span>
            </button>
          )
        })}
      </nav>

      <div className="mx-4 mb-4 rounded-[10px] border border-[#263548] bg-[#091523] p-4">
        <div className="flex items-center gap-3">
          <Flame className="text-[#f5f8fc]" size={25} />
          <div>
            <div className="text-[17px] font-semibold text-white">12</div>
            <div className="text-[11px] text-muted">Day streak</div>
          </div>
        </div>
        <div className="mt-4 flex gap-1.5">
          {[1, 1, 1, 1, 1, 0, 0].map((filled, index) => <span key={index} className={`h-1.5 flex-1 rounded-sm ${filled ? 'bg-cobalt' : 'bg-[#23334a]'}`} />)}
        </div>
      </div>

      <div className="user-card mx-4 mb-4 flex items-center gap-3 border-t border-[#1c2b3e] pt-4">
        <div className="grid h-9 w-9 place-items-center rounded-full border border-[#36455a] bg-[#172437] text-xs font-semibold text-white">AM</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[#e7edf5]">Alex Morgan</p>
          <p className="text-[10px] text-muted">Level 12</p>
        </div>
        <ChevronDown size={14} className="text-muted" />
      </div>
    </aside>
  )
}

function Control({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`control block ${wide ? 'topic-control' : ''}`}>
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[.1em] text-[#8793a5]">{label}</span>
      <button className="flex h-10 w-full items-center justify-between rounded-[7px] border border-[#2b3a4e] bg-[#0a1524] px-3.5 text-[13px] font-medium text-[#eef2f7]">
        <span className="flex items-center gap-2">{children}</span>
        <ChevronDown size={14} className="text-[#91a0b3]" />
      </button>
    </label>
  )
}

function TopControls() {
  return (
    <header className="top-controls flex h-[78px] items-center gap-4">
      <Control label="Topic" wide>Quantum Computing</Control>
      <div className="ml-auto flex items-end gap-3">
        <Control label="Time per day"><Clock3 size={16} className="text-[#9aa6b7]" />30 min / day</Control>
        <Control label="Goal date"><CalendarDays size={16} className="text-[#9aa6b7]" />Sep 23, 2025</Control>
        <button className="generate-button flex h-10 items-center gap-2 rounded-[7px] bg-[#1759dc] px-5 text-[12px] font-semibold text-white hover:bg-[#1d68f5]">
          <WandSparkles size={16} /> Generate Plan
        </button>
      </div>
    </header>
  )
}

function StudyOverview() {
  return (
    <aside className="study-overview overflow-hidden rounded-[10px] border border-line bg-panel">
      <section className="border-b border-[#263448] p-5">
        <div className="flex items-center justify-between">
          <p className="section-label text-[#dfe5ed]">Today's lesson</p>
          <button className="text-[10px] text-[#4d8fff] underline underline-offset-2">View Plan</button>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#2a70e5] bg-[#1252c8] text-white"><CircleDot size={21} /></div>
          <div>
            <p className="text-[13px] font-semibold text-[#f3f6fa]">Quantum Algorithms</p>
            <p className="mt-1 text-[11px] text-muted">Entanglement &amp; Superposition</p>
            <p className="mt-1 text-[11px] text-muted">30 min</p>
          </div>
        </div>
        <button className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-[#175edc] text-[11px] font-semibold text-white">
          Start Lesson <Play size={13} fill="currentColor" />
        </button>
      </section>

      <section className="border-b border-[#263448] p-5">
        <p className="section-label text-[#dfe5ed]">Target milestone</p>
        <div className="mt-5 flex items-center gap-3">
          <Target size={42} className="shrink-0 text-[#9850da]" />
          <div>
            <p className="text-[12px] font-semibold text-[#f1f4f8]">Quantum Algorithms</p>
            <p className="mt-1 text-[10px] text-muted">Est. Completion</p>
            <p className="mt-1 text-[11px] font-semibold text-[#a866e5]">Sep 23, 2025</p>
          </div>
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-sm bg-[#1b2a3d]"><span className="block h-full w-[68%] bg-[#1f70f4]" /></div>
        <p className="mt-2 text-[10px] text-[#9ca7b7]">68% of path completed</p>
      </section>

      <section className="p-5">
        <p className="section-label text-[#dfe5ed]">Total study time</p>
        <div className="mt-5 flex items-start">
          <Clock3 size={20} className="mr-3 mt-1 text-muted" />
          <div><p className="text-[20px] font-medium text-[#f1f4f8]">46h 30m</p><p className="text-[10px] text-muted">Total Hours</p></div>
          <div className="ml-auto border-l border-[#263448] pl-4"><p className="text-[10px] text-muted">Avg. / Day</p><p className="mt-1 text-[17px] font-medium text-[#f1f4f8]">30 min</p></div>
        </div>
        <div className="study-bars mt-4 flex h-12 items-end justify-between gap-3">
          {[16, 31, 44, 35, 27, 21, 0].map((height, index) => (
            <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className={`w-3 rounded-t-sm ${index === 3 ? 'bg-[#2478ff]' : 'bg-[#173467]'}`} style={{ height }} />
              <small className={index === 3 ? 'text-[#6da4ff]' : 'text-muted'}>{['S','M','T','W','T','F','S'][index]}</small>
            </div>
          ))}
        </div>
      </section>
    </aside>
  )
}

function WeeklyCalendar() {
  const statuses = ['done', 'empty', 'empty', 'current', 'empty', 'empty', 'done']
  return (
    <section className="weekly-calendar overflow-hidden rounded-[10px] border border-line bg-panel" aria-label="Weekly plan">
      <div className="calendar-strip grid h-full grid-cols-[minmax(0,1fr)_210px]">
        <div className="grid grid-cols-7">
          {week.map((day, index) => (
            <div key={day.day} aria-current={day.current ? 'date' : undefined} className={`calendar-day flex flex-col items-center justify-center text-center ${day.current ? 'current' : ''}`}>
              <span className="date-number text-[42px] font-medium leading-none text-[#d9dee7]">{day.date}</span>
              <span className="weekday mt-2 text-[11px] font-medium tracking-[.06em] text-[#9ba5b4]">{day.day}</span>
              <span className={`mt-3 grid h-6 w-6 place-items-center rounded-full border ${statuses[index] === 'done' ? 'border-[#2775e8] bg-[#1461d6] text-white' : statuses[index] === 'current' ? 'border-[#75a6ff] bg-[#e9c40f]' : 'border-[#aeb7c5]'}`}>
                {statuses[index] === 'done' && <Check size={12} strokeWidth={2.5} />}
              </span>
            </div>
          ))}
        </div>
        <div className="calendar-summary flex items-center border-l border-[#263448] px-4">
          <div className="w-full">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-[.13em] text-[#a7b3c5]">This week</p>
              <span className="text-[9px] font-semibold text-[#5d9cff]">29%</span>
            </div>
            <div className="mt-3 grid grid-cols-2 divide-x divide-[#2a394d]">
              <div className="pr-3">
                <strong className="block text-[22px] font-semibold leading-none text-white">2<span className="text-[13px] font-medium text-muted"> / 7</span></strong>
                <span className="mt-2 block text-[8px] font-semibold uppercase tracking-[.08em] text-muted">Completed</span>
              </div>
              <div className="pl-3">
                <strong className="block text-[20px] font-semibold leading-none text-white">3h <span className="text-[14px] font-medium text-muted">0m</span></strong>
                <span className="mt-2 block text-[8px] font-semibold uppercase tracking-[.08em] text-muted">Planned</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1" aria-label="2 of 7 lessons completed">
              {week.map((day, index) => <span key={day.day} className={`h-1 rounded-sm ${index < 2 ? 'bg-[#2478ff]' : 'bg-[#223249]'}`} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  return (
    <div className="app-shell min-h-screen bg-ink text-white">
      <Sidebar />
      <main className="main-column min-w-0 px-5 pb-5">
        <TopControls />
        <div className="dashboard-grid min-h-0">
          <LearningMap />
          <StudyOverview />
          <WeeklyCalendar />
        </div>
      </main>
    </div>
  )
}
