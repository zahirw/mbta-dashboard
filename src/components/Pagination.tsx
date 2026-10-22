interface PaginationProps {
  /** 1-based current page */
  page: number
  pageSize: number
  total: number
  pageSizeOptions: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

/** Page numbers to show: first, last and the neighbours of the current page, with gaps as null. */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  const visible = new Set([1, totalPages, page - 1, page, page + 1])
  const pages = [...visible].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const result: (number | null)[] = []
  for (const [i, p] of pages.entries()) {
    if (i > 0 && p - pages[i - 1] > 1) result.push(null)
    result.push(p)
  }
  return result
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === 'left' ? 'm12 5-5 5 5 5' : 'm8 5 5 5-5 5'} />
    </svg>
  )
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'

export default function Pagination({
  page,
  pageSize,
  total,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const navClass = `flex items-center gap-1 rounded-lg border border-primary-300 bg-secondary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-secondary sm:py-1.5 ${FOCUS}`
  const numberClass = `size-9 rounded-lg text-sm font-medium transition sm:size-8 ${FOCUS}`

  return (
    <div className="mt-6 flex flex-col gap-4 py-2 text-sm text-primary-600 lg:flex-row lg:items-center lg:justify-between">
      <p>
        Showing{' '}
        <span className="font-medium text-black">
          {start}–{end}
        </span>{' '}
        of <span className="font-medium text-black">{total}</span>
      </p>

      <label className="flex items-center gap-2">
        Per page
        <span className="relative">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={`appearance-none rounded-lg border border-primary-300 bg-secondary py-2 pr-8 pl-3 font-medium text-black transition hover:border-primary-500 sm:py-1.5 ${FOCUS}`}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-primary"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 8 5 5 5-5" />
          </svg>
        </span>
      </label>

      <nav aria-label="Pagination" className="flex items-center justify-between gap-2">
        <button
          type="button"
          className={navClass}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ArrowIcon direction="left" />
          Prev
        </button>

        <span className="sm:hidden">
          Page <span className="font-medium text-black">{page}</span> of {totalPages}
        </span>
        <ul className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, totalPages).map((p, i) =>
            p === null ? (
              <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-primary-500">
                …
              </li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                  onClick={() => onPageChange(p)}
                  className={`${numberClass} ${
                    p === page
                      ? 'bg-primary text-secondary'
                      : 'text-primary hover:bg-primary-50'
                  }`}
                >
                  {p}
                </button>
              </li>
            ),
          )}
        </ul>

        <button
          type="button"
          className={navClass}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ArrowIcon direction="right" />
        </button>
      </nav>
    </div>
  )
}
