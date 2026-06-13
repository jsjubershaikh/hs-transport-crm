import { useState, useEffect } from 'react';
import { Loader2, UserX, UserCheck, CalendarX } from 'lucide-react';
import Modal from './Modal.jsx';
import { studentApi, feeApi } from '../api/endpoints.js';
import { useUI } from '../context/UIContext.jsx';
import { MONTHS, MONTH_LABELS } from '../utils/constants.js';

/**
 * InactiveModal — handles two flows:
 *
 * mode = 'deactivate':
 *   Admin picks the month the student LEFT from.
 *   All pending months FROM that month onwards are waived (₹0) and
 *   the student is marked inactive.
 *
 * mode = 'rejoin':
 *   Admin picks the month the student is REJOINING from.
 *   All pending months BEFORE the rejoin month (the gap) are waived,
 *   and the student is marked active again.
 */
export default function InactiveModal({ open, mode, student, fees = [], academicYearId, onClose, onDone, onInactivated, onRejoined }) {
  const { toast } = useUI();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setSelectedMonth('');
  }, [open]);

  if (!student) return null;

  const isDeactivate = mode === 'deactivate';

  // For deactivate: months that are still pending (not yet paid)
  // For rejoin: months that are pending (the gap we want to waive)
  const pendingMonths = MONTHS.filter((m) => {
    const rec = fees.find((f) => f.month === m);
    return !rec || rec.status === 'pending' || (rec.status === 'partial' && rec.paidAmount === 0);
  });

  // Months that will be waived based on selection
  const monthsToWaive = (() => {
    if (!selectedMonth) return [];
    const idx = MONTHS.indexOf(selectedMonth);
    if (idx === -1) return [];

    if (isDeactivate) {
      // Waive selected month and all pending months AFTER it
      return pendingMonths.filter((m) => MONTHS.indexOf(m) >= idx);
    } else {
      // Rejoin: waive all pending months BEFORE the rejoin month (the gap)
      return pendingMonths.filter((m) => MONTHS.indexOf(m) < idx);
    }
  })();

  const submit = async () => {
    if (!selectedMonth) return toast.error('Please select a month');
    setSubmitting(true);
    try {
      // 1. Waive the gap/leave months if any
      if (monthsToWaive.length > 0) {
        await feeApi.adjustFees({
          studentId: student._id,
          academicYearId,
          months: monthsToWaive,
          reason: isDeactivate
            ? `Student left transport from ${MONTH_LABELS[selectedMonth]}`
            : `Student rejoined from ${MONTH_LABELS[selectedMonth]} — gap months waived`,
        });
      }

      // 2. Update student status
      await studentApi.update(student._id, {
        status: isDeactivate ? 'inactive' : 'active',
      });

      // 3. On rejoin: restore ALL months from rejoin month onwards that have
      //    monthlyFee=0 (waived during deactivation). We check ONLY monthlyFee===0
      //    because the pre-save hook sets status='pending' even on waived records
      //    (since paidAmount=0 and fee=0 → pending), so we cannot rely on status.
      if (!isDeactivate && selectedMonth) {
        const rejoiningIdx = MONTHS.indexOf(selectedMonth);
        const monthsToRestore = MONTHS.filter((m, idx) => {
          if (idx < rejoiningIdx) return false;
          const rec = fees.find((f) => f.month === m);
          // Match waived months: fee is 0 AND no payment has been made
          return rec && Number(rec.monthlyFee) === 0 && Number(rec.paidAmount) === 0;
        });

        if (monthsToRestore.length > 0) {
          await feeApi.adjustFees({
            studentId: student._id,
            academicYearId,
            months: monthsToRestore,
            reason: `Rejoined from ${MONTH_LABELS[selectedMonth]} — fees restored`,
            restore: true,
            restoreFee: student.monthlyFee,
          });
        }
      }

      toast.success(
        isDeactivate
          ? `${student.name} marked inactive. ${monthsToWaive.length} month${monthsToWaive.length !== 1 ? 's' : ''} waived.`
          : `${student.name} rejoined from ${MONTH_LABELS[selectedMonth]}. ${monthsToWaive.length} gap month${monthsToWaive.length !== 1 ? 's' : ''} waived.`
      );
      onDone?.();
      onClose?.();
      // Navigate after a short delay so the toast is visible
      if (isDeactivate) {
        setTimeout(() => onInactivated?.(), 400);
      } else {
        setTimeout(() => onRejoined?.(), 400);
      }
    } catch (e) {
      toast.error(e.normalizedMessage || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={isDeactivate ? 'Mark Student Inactive' : 'Rejoin Transport'}
      size="md"
      footer={
        <>
          <button className="btn btn-outline btn-md" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className={`btn btn-md ${isDeactivate ? 'btn-danger' : 'btn-secondary'}`}
            onClick={submit}
            disabled={submitting || !selectedMonth}
          >
            {submitting
              ? <Loader2 size={16} className="animate-spin" />
              : isDeactivate ? <UserX size={16} /> : <UserCheck size={16} />}
            {isDeactivate ? 'Mark Inactive' : 'Confirm Rejoin'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Info banner */}
        <div className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${
          isDeactivate
            ? 'border-warning/30 bg-warning/5 text-warning'
            : 'border-success/30 bg-success/5 text-success'
        }`}>
          {isDeactivate ? <UserX size={16} className="mt-0.5 shrink-0" /> : <UserCheck size={16} className="mt-0.5 shrink-0" />}
          <div>
            <p className="font-semibold">{student.name}</p>
            <p className="mt-0.5 text-xs opacity-80">
              {isDeactivate
                ? 'Select the month the student stopped using transport. That month and all remaining pending months will be waived (₹0) and the student will be marked inactive.'
                : 'Select the month the student is rejoining. All pending gap months before this will be waived. The student will be marked active again.'}
            </p>
          </div>
        </div>

        {/* Month selector */}
        <div>
          <label className="label">
            {isDeactivate ? 'Left transport from *' : 'Rejoining from *'}
          </label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {MONTHS.map((m) => {
              const rec = fees.find((f) => f.month === m);
              const isPaid = rec?.status === 'paid' && rec?.monthlyFee > 0;
              const isWaived = rec?.status === 'paid' && rec?.monthlyFee === 0;
              const isSelected = m === selectedMonth;
              const willBeWaived = monthsToWaive.includes(m);

              // For deactivate: can only pick pending months
              // For rejoin: can pick any month that comes after all paid months
              const isDisabled = isDeactivate
                ? isPaid || isWaived
                : isPaid || isWaived;

              return (
                <button
                  key={m}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setSelectedMonth(m)}
                  className={`relative rounded-xl border px-2 py-2.5 text-xs font-medium transition
                    ${isDisabled ? 'cursor-not-allowed border-border bg-slate-50 text-slate-400' : ''}
                    ${!isDisabled && isSelected ? (isDeactivate ? 'border-danger bg-danger/10 text-danger' : 'border-success bg-success/10 text-success') : ''}
                    ${!isDisabled && !isSelected && willBeWaived ? 'border-warning/50 bg-warning/5 text-warning' : ''}
                    ${!isDisabled && !isSelected && !willBeWaived ? 'border-border bg-white text-text-primary hover:border-primary/40' : ''}
                  `}
                >
                  {MONTH_LABELS[m]?.slice(0, 3)}
                  {isPaid && <span className="block text-[9px] text-success">Paid</span>}
                  {isWaived && <span className="block text-[9px] text-slate-400">Waived</span>}
                  {willBeWaived && !isSelected && <span className="block text-[9px] text-warning">Waive</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        {selectedMonth && (
          <div className="rounded-xl bg-slate-50 p-3.5 text-sm space-y-1.5">
            <p className="font-semibold text-text-primary">
              {isDeactivate
                ? `Student leaves from ${MONTH_LABELS[selectedMonth]}`
                : `Student rejoins from ${MONTH_LABELS[selectedMonth]}`}
            </p>
            {monthsToWaive.length > 0 ? (
              <p className="text-text-secondary text-xs">
                <CalendarX size={12} className="inline mr-1" />
                Months to waive: <strong>{monthsToWaive.map((m) => MONTH_LABELS[m]).join(', ')}</strong>
                {' '}— set to ₹0, marked as settled
              </p>
            ) : (
              <p className="text-text-secondary text-xs">
                No months to waive — status will be updated only.
              </p>
            )}
            <p className="text-xs font-medium">
              Student will be marked <span className={isDeactivate ? 'text-danger' : 'text-success'}>
                {isDeactivate ? 'Inactive' : 'Active'}
              </span>
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
