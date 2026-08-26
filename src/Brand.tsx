export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${compact ? '' : 'px-5 py-6'}`}>
      <svg width={compact ? 32 : 41} height={compact ? 31 : 40} viewBox="0 0 42 40" aria-hidden="true">
        <path d="M4 5v29M4 5l17 20M21 25L38 5M38 5v29" fill="none" stroke="#1769ff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 5l17 20L38 5" fill="none" stroke="#9cc4ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="brand-copy">
        <strong className={`block font-bold tracking-[.08em] text-[#f2f5f9] ${compact ? 'text-[16px]' : 'text-[20px]'}`}>METRO</strong>
        <span className="block text-[9px] tracking-[.12em] text-muted">LEARNING PATH</span>
      </div>
    </div>
  )
}
