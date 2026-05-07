export function SkeletonCard() {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-slate-700/50 rounded w-24 mb-3"></div>
      <div className="h-8 bg-slate-700/50 rounded w-32"></div>
    </div>
  );
}
