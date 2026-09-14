// Brand mark generated for the charity (docs/logo-options has the alternatives).
// The wordmark stays as live text so it's crisp at every size and easy to restyle.
export function Mark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <img src="/logo-mark.svg" width={size} height={size} alt="" aria-hidden="true" className={`shrink-0 ${className}`} />;
}

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark size={compact ? 36 : 44} />
      <span className="leading-none">
        <span className={`block font-display text-[1.35rem] font-bold tracking-wide ${light ? "text-white" : "text-ink-900"}`}>N.I.P.P.E.R.S.</span>
        {!compact && <span className={`mt-0.5 block text-[0.68rem] font-bold uppercase tracking-wider ${light ? "text-white/80" : "text-ink-500"}`}>Newhaven Play Project</span>}
      </span>
    </span>
  );
}
