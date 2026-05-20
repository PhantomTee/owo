export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-md bg-forest/10 ${className}`} style={style} />
}

export function StreamCardSkeleton() {
  return (
    <div className="rounded-lg border border-forest/10 bg-white/70 p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-5 w-56" />
      <Skeleton className="mt-4 h-3 w-full rounded-full" />
      <div className="mt-3 flex justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="mt-5 flex gap-3">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>
    </div>
  )
}

export function WorkerBalanceSkeleton() {
  return (
    <div className="rounded-lg bg-forest p-8 shadow-soft">
      <Skeleton className="h-4 w-28 bg-cream/20" />
      <Skeleton className="mt-3 h-20 w-64 bg-cream/20" />
      <Skeleton className="mt-3 h-4 w-48 bg-cream/20" />
      <Skeleton className="mt-7 h-10 w-36 rounded-md bg-cream/20" />
    </div>
  )
}

export function AgentPanelSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-gold/40">&gt;</span>
          <Skeleton className="h-4 bg-[#3a4d33]/60" style={{ width: `${55 + (i % 3) * 15}%` }} />
        </div>
      ))}
    </div>
  )
}
