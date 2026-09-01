export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'brand brand-compact' : 'brand px-5 py-6'}>
      <div className="brand-copy leading-none">
        <img className="brand-full brand-pink" src="/brand/youknow-overlap.png" alt="YouKnow" />
        <img className="brand-full brand-blue" src="/brand/youknow-overlap-blue.png" alt="" aria-hidden="true" />
        <strong className="brand-short hidden text-[17px] font-bold text-[#fff4f7]" aria-label="YouKnow">YK</strong>
        <span className="brand-tagline mt-1.5 block whitespace-nowrap text-[7px] font-semibold tracking-[.08em] text-muted">YOU KNOW WHAT TO LEARN NEXT</span>
      </div>
    </div>
  )
}
