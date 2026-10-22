interface SpinnerProps {
  /** Announced to screen readers; also shown next to the spinner unless `hideLabel` is set. */
  label?: string
  hideLabel?: boolean
  className?: string
}

export default function Spinner({ label = 'Loading…', hideLabel = false, className = '' }: SpinnerProps) {
  return (
    <span role="status" className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-4 shrink-0 animate-spin text-primary motion-reduce:animate-none"
        fill="none"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className={hideLabel ? 'sr-only' : ''}>{label}</span>
    </span>
  )
}
