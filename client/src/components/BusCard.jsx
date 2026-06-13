import { formatNumber } from '../utils/format.js';

/**
 * Visual occupancy bar — green <80%, orange ≥80%, red when full.
 * Reused inside the Bus Management table cell.
 */
export function OccupancyBar({ occupied = 0, capacity = 1 }) {
  const pct = capacity ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0;
  const color = pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-success';
  return (
    <div className="min-w-[120px]">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-text-primary">
          {formatNumber(occupied)}/{formatNumber(capacity)}
        </span>
        <span className="text-text-secondary">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default OccupancyBar;
