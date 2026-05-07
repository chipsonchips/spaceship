interface SkeletonTabsProps {
  tabCount?: number;
}

export function SkeletonTabs({ tabCount = 4 }: SkeletonTabsProps) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden animate-pulse">
      <div className="flex border-b border-slate-700">
        {Array.from({ length: tabCount }).map((_, idx) => (
          <div
            key={idx}
            className="flex-1 h-12 bg-slate-700/50 border-r border-slate-700 last:border-r-0"
          ></div>
        ))}
      </div>
      <div className="p-6 space-y-4">
        <div className="h-6 bg-slate-700/50 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-4 bg-slate-700/50 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
