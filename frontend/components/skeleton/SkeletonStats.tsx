interface SkeletonStatsProps {
  count?: number;
}

export function SkeletonStats({ count = 4 }: SkeletonStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 animate-pulse"
        >
          <div className="h-4 bg-slate-700/50 rounded w-20 mb-3"></div>
          <div className="h-8 bg-slate-700/50 rounded w-24"></div>
        </div>
      ))}
    </div>
  );
}
