export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? '' : 'px-5 py-6'} aria-label="YouKnow">
      <div className="brand-copy leading-none">
        <strong className={`brand-full block font-bold tracking-[-.04em] text-[#f2f5f9] ${compact ? 'text-[20px]' : 'text-[24px]'}`}>You<span className="text-[#5268ff]">Know</span></strong>
        <strong className="brand-short hidden text-[17px] font-bold tracking-[-.04em] text-[#f2f5f9]">Y<span className="text-[#5268ff]">K</span></strong>
        <span className="brand-tagline mt-1.5 block whitespace-nowrap text-[7px] font-semibold tracking-[.08em] text-muted">YOU KNOW WHAT TO LEARN NEXT</span>
      </div>
    </div>
  )
}
