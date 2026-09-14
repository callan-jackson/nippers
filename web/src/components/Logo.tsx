// Placeholder brand mark until the club supplies its logo: a four-colour
// pinwheel (play, inclusion, outdoors, energy) with the acronym wordmark.
export function Mark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect width="64" height="64" rx="18" fill="#2B7FD6" />
      <g transform="translate(32 32)">
        <path d="M0 0 L0 -22 A22 22 0 0 1 22 0 Z" fill="#FFD24D" />
        <path d="M0 0 L22 0 A22 22 0 0 1 0 22 Z" fill="#4CBF6B" />
        <path d="M0 0 L0 22 A22 22 0 0 1 -22 0 Z" fill="#FF7A66" />
        <path d="M0 0 L-22 0 A22 22 0 0 1 0 -22 Z" fill="#7FBAF5" />
        <circle r="6" fill="#fff" />
      </g>
    </svg>
  );
}

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark size={compact ? 34 : 40} />
      <span className="leading-none">
        <span className={`block font-display text-[1.35rem] font-bold tracking-wide ${light ? "text-white" : "text-ink-900"}`}>N.I.P.P.E.R.S.</span>
        {!compact && <span className={`mt-0.5 block text-[0.68rem] font-bold uppercase tracking-wider ${light ? "text-white/80" : "text-ink-500"}`}>Newhaven Play Project</span>}
      </span>
    </span>
  );
}
