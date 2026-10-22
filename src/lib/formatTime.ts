const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
  ['second', 1],
]

const MAX_RELATIVE_SECONDS = 7 * 86_400

/** "just now", "2 minutes ago", …; falls back to the full date once it is older than a week. */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)

  if (seconds < 45) return 'just now'
  if (seconds > MAX_RELATIVE_SECONDS) return date.toLocaleString()

  const [unit, size] = UNITS.find(([, size]) => seconds >= size) ?? UNITS[UNITS.length - 1]
  return rtf.format(-Math.round(seconds / size), unit)
}
