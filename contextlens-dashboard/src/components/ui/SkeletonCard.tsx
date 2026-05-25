export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl bg-card border border-cardBorder p-4 space-y-3">
      <div className="h-4 animate-shimmer rounded-md w-3/4" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div
          key={i}
          className={`h-3 animate-shimmer rounded-md ${i === lines - 2 ? 'w-1/2' : 'w-5/6'}`}
          style={{ animationDelay: `${(i + 1) * 100}ms` }}
        />
      ))}
    </div>
  )
}
