export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse rounded-lg bg-card border border-cardBorder p-4 space-y-3">
      <div className="h-4 bg-gray-700/60 rounded w-3/4" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div key={i} className={`h-3 bg-gray-700/40 rounded ${i === lines - 2 ? 'w-1/2' : 'w-full'}`} />
      ))}
    </div>
  )
}
