/** Inline skeleton block. */
export default function Skeleton({ className = '', rounded = 'rounded-md' }) {
  return <div className={`skeleton ${rounded} ${className}`} />;
}

/** A skeleton table — N rows × M columns — shown while a DataTable loads. */
export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 ${c === 0 ? 'w-10 rounded-full' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Card-shaped skeletons for stat-card grids. */
export function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <Skeleton className="mb-4 h-10 w-10 rounded-xl" />
          <Skeleton className="mb-2 h-3 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}
