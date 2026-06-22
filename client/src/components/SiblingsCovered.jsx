/**
 * A clean, professional table of the siblings a family payment covers.
 * Rendered on receipts only when the student actually has siblings.
 */
export default function SiblingsCovered({ siblings = [] }) {
  if (!siblings.length) return null;
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Siblings Covered</h4>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left text-[9px] font-bold uppercase tracking-wider text-text-secondary">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 text-right">Class</th>
            </tr>
          </thead>
          <tbody>
            {siblings.map((sib, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-1.5 font-semibold text-text-primary">{sib.name || '—'}</td>
                <td className="px-3 py-1.5 text-right text-text-secondary">
                  {sib.class ? `Class ${sib.class}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
