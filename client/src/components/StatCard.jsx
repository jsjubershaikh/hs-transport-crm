import { TrendingUp, TrendingDown } from 'lucide-react';
import { useCountUp } from '../hooks/useCountUp.js';
import { formatCurrency, formatNumber } from '../utils/format.js';

const VARIANTS = {
  navy: 'bg-primary/10 text-primary',
  green: 'bg-success/10 text-success',
  blue: 'bg-blue-500/10 text-blue-600',
  purple: 'bg-purple-500/10 text-purple-600',
  teal: 'bg-teal-500/10 text-teal-600',
  red: 'bg-danger/10 text-danger',
  orange: 'bg-accent/10 text-accent',
};

/**
 * Animated stat card. The numeric value counts up on mount.
 * @param {boolean} currency - format the value as INR
 */
export default function StatCard({ icon: Icon, label, value = 0, trend, currency = false, variant = 'navy', style }) {
  const animated = useCountUp(Number(value) || 0);
  const display = currency ? formatCurrency(animated) : formatNumber(Math.round(animated));
  const trendUp = trend == null ? null : trend >= 0;

  return (
    <div className="card card-hover p-5 animate-fade-slide-up" style={style}>
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${VARIANTS[variant] || VARIANTS.navy}`}>
          {Icon && <Icon size={22} />}
        </div>
        {trendUp != null && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
              trendUp ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
            }`}
          >
            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-text-secondary">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold tracking-tight text-text-primary">{display}</p>
    </div>
  );
}
