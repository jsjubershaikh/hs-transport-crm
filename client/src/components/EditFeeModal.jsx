import { useState, useEffect } from 'react';
import { Loader2, Pencil, AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';
import { feeApi } from '../api/endpoints.js';
import { useUI } from '../context/UIContext.jsx';
import { PAYMENT_MODES, MONTH_LABELS } from '../utils/constants.js';
import { formatCurrency } from '../utils/format.js';

/**
 * EditFeeModal — lets a superadmin correct a paid/partial fee record.
 * Resets paidAmount to the new value, deletes old receipts, generates a fresh one.
 *
 * Props:
 *   open         – boolean
 *   fee          – the fee record object (needs _id, month, monthlyFee, paidAmount, paymentMode, paymentDate, notes)
 *   studentName  – string for display
 *   onClose      – () => void
 *   onDone       – (result) => void  called after successful save
 */
export default function EditFeeModal({ open, fee, studentName, onClose, onDone }) {
  const { toast } = useUI();
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [collectedBy, setCollectedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && fee) {
      setPaidAmount(String(fee.paidAmount ?? ''));
      setPaymentMode(fee.paymentMode || 'cash');
      setPaymentDate(fee.paymentDate ? new Date(fee.paymentDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      setNotes(fee.notes || '');
      setCollectedBy(fee.collectedBy || '');
    }
  }, [open, fee]);

  if (!fee) return null;
  const name = studentName || fee.studentName || 'Student';

  const submit = async () => {
    const amt = Number(paidAmount);
    if (isNaN(amt) || amt < 0) return toast.error('Enter a valid amount (0 to reset)');
    if (amt > fee.monthlyFee) return toast.error(`Cannot exceed monthly fee of ${formatCurrency(fee.monthlyFee)}`);
    setSubmitting(true);
    try {
      const res = await feeApi.edit(fee._id, {
        paidAmount: amt,
        paymentMode,
        paymentDate: paymentDate || undefined,
        notes,
        collectedBy,
      });
      toast.success(amt === 0 ? 'Fee reset to pending' : 'Fee updated successfully');
      onDone?.(res);
      onClose?.();
    } catch (e) {
      toast.error(e.normalizedMessage || 'Failed to edit fee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Edit Fee Record"
      size="md"
      footer={
        <>
          <button className="btn btn-outline btn-md" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-secondary btn-md" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
            Save Changes
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Warning */}
        <div className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning/10 p-3.5 text-sm text-warning">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>Editing will <strong>delete existing receipts</strong> for this month and generate a new one with the corrected amount. Set paid amount to <strong>0</strong> to fully reset to pending.</p>
        </div>

        {/* Read-only summary */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
          <ReadOnly label="Student" value={name} />
          <ReadOnly label="Month" value={MONTH_LABELS[fee.month] || fee.month} />
          <ReadOnly label="Monthly Fee" value={formatCurrency(fee.monthlyFee)} />
          <ReadOnly label="Current Paid" value={formatCurrency(fee.paidAmount)} highlight />
        </div>

        {/* Editable fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">
              Corrected Paid Amount <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              className="input"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              min={0}
              max={fee.monthlyFee}
              placeholder={`0 – ${fee.monthlyFee}`}
            />
            <p className="mt-1 text-xs text-text-secondary">Max: {formatCurrency(fee.monthlyFee)}</p>
          </div>
          <div>
            <label className="label">Payment Mode</label>
            <select className="input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              {PAYMENT_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Payment Date</label>
            <input type="date" className="input" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Collected By</label>
            <input className="input" value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} placeholder="Staff name" />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ReadOnly({ label, value, highlight }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`font-semibold ${highlight ? 'text-primary' : 'text-text-primary'}`}>{value}</p>
    </div>
  );
}
