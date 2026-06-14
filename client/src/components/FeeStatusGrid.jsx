import { IndianRupee, Pencil, Download, MessageCircle } from 'lucide-react';
import Badge from './Badge.jsx';
import { MONTHS, MONTH_LABELS } from '../utils/constants.js';
import { formatCurrency, formatDate } from '../utils/format.js';

/**
 * 11-month fee grid for a student.
 * Props:
 *   fees        – array of fee records
 *   onCollect   – (fee) => void  — show CollectFeeModal
 *   onEdit      – (fee) => void  — show EditFeeModal  (superadmin)
 *   onReceipt   – (receiptId, fee, student) => void  — open ReceiptModal
 *   student     – student object (for WhatsApp mobile number)
 *   isSuperAdmin – boolean
 */
export default function FeeStatusGrid({ fees = [], onCollect, onEdit, onReceipt, student, isSuperAdmin }) {
  const byMonth = new Map(fees.map((f) => [f.month, f]));
  const rows = MONTHS.map((m) => byMonth.get(m)).filter(Boolean);

  const handleWhatsApp = (f) => {
    const mobile = student?.mobile;
    const month = MONTH_LABELS[f.month] || f.month;
    const text =
      f.remainingAmount > 0
        ? `Dear Parent of ${student?.name || 'Student'}, transport fee for ${month} is ₹${f.remainingAmount} pending. Kindly pay at earliest. - HS School Bus`
        : `Dear Parent of ${student?.name || 'Student'}, transport fee receipt for ${month}: ${formatCurrency(f.paidAmount)} paid. Receipt: ${f.receiptNumber || ''}. - HS School Bus`;
    window.open(`https://wa.me/91${mobile}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <th className="px-4 py-3">Month</th>
            <th className="px-4 py-3 text-right">Monthly Fee</th>
            <th className="px-4 py-3 text-right">Paid</th>
            <th className="px-4 py-3 text-right">Remaining</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3">Payment Date</th>
            <th className="px-4 py-3">Mode</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => {
            const isPaid = f.status === 'paid';
            const isPartial = f.status === 'partial';
            const hasReceipt = !!(f.receiptId || f.receiptNumber);

            return (
              <tr key={f._id} className="border-b border-border/70 last:border-0 hover:bg-slate-50/70">
                <td className="px-4 py-3 font-medium text-text-primary">{MONTH_LABELS[f.month] || f.month}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(f.monthlyFee)}</td>
                <td className="px-4 py-3 text-right font-mono text-success">{formatCurrency(f.paidAmount)}</td>
                <td className="px-4 py-3 text-right font-mono text-danger">{formatCurrency(f.remainingAmount)}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={f.status} />
                </td>
                <td className="px-4 py-3 text-text-secondary">{f.paymentDate ? formatDate(f.paymentDate) : '—'}</td>
                <td className="px-4 py-3 capitalize text-text-secondary">{f.paymentMode || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Collect — only when there's remaining balance */}
                    {f.remainingAmount > 0 && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onCollect?.(f)}
                        title="Collect payment"
                      >
                        <IndianRupee size={13} /> Collect
                      </button>
                    )}

                    {/* Edit — only for fully paid rows, superadmin only */}
                    {isPaid && isSuperAdmin && (
                      <button
                        className="btn btn-outline btn-sm px-2"
                        onClick={() => onEdit?.(f)}
                        title="Edit fee record"
                      >
                        <Pencil size={13} />
                      </button>
                    )}

                    {/* Download receipt */}
                    {(isPaid || isPartial) && (
                      <button
                        className="btn btn-ghost btn-sm px-2 text-primary"
                        onClick={() => onReceipt?.(f)}
                        title="Download / View receipt"
                      >
                        <Download size={14} />
                      </button>
                    )}

                    {/* WhatsApp */}
                    <button
                      className="btn btn-ghost btn-sm px-2 text-success"
                      onClick={() => handleWhatsApp(f)}
                      title="Share on WhatsApp"
                    >
                      <MessageCircle size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
