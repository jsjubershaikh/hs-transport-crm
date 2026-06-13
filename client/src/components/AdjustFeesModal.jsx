import { useState, useEffect } from 'react';
import { Loader2, CalendarX, CheckCircle2 } from 'lucide-react';
import Modal from './Modal.jsx';
import { feeApi } from '../api/endpoints.js';
import { useUI } from '../context/UIContext.jsx';
import { MONTHS, MONTH_LABELS } from '../utils/constants.js';
import { formatCurrency } from '../utils/format.js';

/**
 * AdjustFeesModal — waive specific months for a student who joined mid-year.
 * Selected months are set to fee=0, treated as paid (no dues).
 *
 * Props:
 *   open           – boolean
 *   student        – student object
 *   fees           – current fee records array
 *   academicYearId – string
 *   onClose        – () => void
 *   onDone         – () => void
 */
export default function AdjustFeesModal({ open, student, fees = [], academicYearId, onClose, onDone }) {
  const { toast } = useUI();
  const [selected, setSelected] = useState([]);
  const [reason, setReason] = useState('Student joined after this month');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setSelected([]); setReason('Student joined after this month'); }
  }, [open]);

  if (!student) return null;

  // Only allow waiving months that haven't been paid yet (pending/partial)
  const waivable = MONTHS.filter((m) => {
    const rec = fees.find((f) => f.month === m);
    return !rec || rec.status === 'pending' || rec.status === 'partial';
  });

  const toggle = (m) => setSelected((s) => s.includes(m) ? s.filter((x) => x !== m) : [...s, m]);
  const selectAll = () => setSelected(waivable);
  const clearAll = () => setSelected([]);

  const submit = async () => {
    if (!selected.length) return toast.error('Select at least one month to waive');
    setSubmitting(true);
    try {
      const res = await feeApi.adjustFees({
        studentId: student._id,
        academicYearId,
        months: selected,
        reason,
      });
      toast.success(`${res.adjusted.length} month${res.adjusted.length !== 1 ? 's' : ''} waived for ${res.studentName}`);
      onDone?.();
      onClose?.();
    } catch (e) {
      toast.error(e.normalizedMessage || 'Adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Adjust Fees — Join Month"
      size="md"
      footer={
        <>
          <button className="btn btn-outline btn-md" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-danger btn-md" onClick={submit} disabled={submitting || !selected.length}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <CalendarX size={16} />}
            Waive {selected.length > 0 ? `${selected.length} Month${selected.length !== 1 ? 's' : ''}` : 'Months'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Info */}
        <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-sm text-primary">
          <CalendarX size={16} className="mt-0.5 shrink-0" />
          <p>Select the months before the student joined. Those months will be set to <strong>₹0 fee</strong> and marked as settled — they won't appear as dues.</p>
        </div>

        {/* Student info */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
          <ReadOnly label="Student" value={student.name} />
          <ReadOnly label="Monthly Fee" value={formatCurrency(student.monthlyFee)} />
        </div>

        {/* Month selector */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">Select Months to Waive</label>
            <div className="flex gap-2 text-xs">
              <button type="button" className="text-accent hover:underline" onClick={selectAll}>All pending</button>
              <span className="text-border">·</span>
              <button type="button" className="text-text-secondary hover:underline" onClick={clearAll}>Clear</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {MONTHS.map((m) => {
              const rec = fees.find((f) => f.month === m);
              const isWaivable = waivable.includes(m);
              const isPaid = rec?.status === 'paid' && rec?.monthlyFee > 0;
              const isAlreadyWaived = rec?.status === 'paid' && rec?.monthlyFee === 0;
              const isChosen = selected.includes(m);

              return (
                <button
                  key={m}
                  type="button"
                  disabled={!isWaivable || isPaid || isAlreadyWaived}
                  onClick={() => isWaivable && toggle(m)}
                  className={`relative rounded-xl border px-3 py-2.5 text-sm font-medium transition
                    ${isAlreadyWaived ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' : ''}
                    ${isPaid ? 'border-success/30 bg-success/5 text-success cursor-not-allowed' : ''}
                    ${isWaivable && !isPaid && !isAlreadyWaived && isChosen ? 'border-danger bg-danger/10 text-danger' : ''}
                    ${isWaivable && !isPaid && !isAlreadyWaived && !isChosen ? 'border-border bg-white text-text-primary hover:border-danger/50 hover:bg-danger/5' : ''}
                  `}
                >
                  {isChosen && <CheckCircle2 size={12} className="absolute right-1.5 top-1.5 text-danger" />}
                  {MONTH_LABELS[m]?.slice(0, 3) || m}
                  {isAlreadyWaived && <span className="block text-[9px] text-slate-400">Waived</span>}
                  {isPaid && <span className="block text-[9px] text-success">Paid</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="label">Reason</label>
          <input
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Student joined from August"
          />
        </div>

        {selected.length > 0 && (
          <div className="rounded-lg bg-danger/5 px-3 py-2 text-xs text-danger">
            ⚠️ Waiving <strong>{selected.map((m) => MONTH_LABELS[m]).join(', ')}</strong> — this sets those months to ₹0 and removes any existing dues. This action can be undone by editing the fee record.
          </div>
        )}
      </div>
    </Modal>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="font-semibold text-text-primary">{value || '—'}</p>
    </div>
  );
}
