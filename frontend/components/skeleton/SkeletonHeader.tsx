export function SkeletonHeader() {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="h-8 bg-slate-700/50 rounded w-48 mb-3"></div>
          <div className="h-4 bg-slate-700/50 rounded w-64"></div>
        </div>
        <div className="h-10 bg-slate-700/50 rounded w-24"></div>
      </div>
    </div>
  );
}
