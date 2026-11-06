// Loading placeholders shaped like the content they stand in for, so nothing
// jumps when the real data arrives. The shimmer stops with reduced motion.

export function CoverSkeleton({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton aspect-2/3 w-full ${className}`} />
}

export function LineSkeleton({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton h-3 rounded-sm ${className}`} />
}

export function CardSkeleton() {
  return (
    <div aria-hidden="true">
      <CoverSkeleton />
      <LineSkeleton className="mt-5 w-4/5" />
      <LineSkeleton className="mt-3 w-1/2" />
    </div>
  )
}

/** A grid of card placeholders; pass the same grid classes the real grid uses. */
export function GridSkeleton({ count = 8, className = '', label = 'Loading books' }) {
  return (
    <div role="status" aria-label={label} className={className}>
      {Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}

export function DetailsSkeleton() {
  return (
    <div role="status" aria-label="Loading book" className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-24">
      <CoverSkeleton className="mx-auto max-w-md" />
      <div className="space-y-5 pt-6">
        <LineSkeleton className="w-40" />
        <div className="skeleton h-16 w-full max-w-xl" />
        <div className="skeleton h-16 w-3/4 max-w-lg" />
        <LineSkeleton className="mt-8 w-48" />
        <div className="skeleton mt-10 h-12 w-72" />
        <LineSkeleton className="mt-10 w-full max-w-xl" />
        <LineSkeleton className="w-full max-w-xl" />
        <LineSkeleton className="w-2/3 max-w-md" />
      </div>
    </div>
  )
}

export function RowSkeleton({ count = 3 }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" className="flex items-center gap-4 p-2">
          <div className="skeleton aspect-2/3 w-11 shrink-0" />
          <div className="flex-1 space-y-2">
            <LineSkeleton className="w-2/3" />
            <LineSkeleton className="w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
