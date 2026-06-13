/** Consistent wrapper around a Recharts chart: title, optional action, body. */
export default function ChartCard({ title, subtitle, action, children, className = '', height = 300 }) {
  return (
    <div className={`card p-5 animate-fade-slide-up ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-base font-bold text-text-primary">{title}</h3>
          {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={{ width: '100%', height }}>{children}</div>
    </div>
  );
}
