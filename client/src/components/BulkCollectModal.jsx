import { useState, useEffect, useMemo } from 'react';
import { Loader2, IndianRupee, Layers, CheckCircle2, AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';
import { feeApi, userApi } from '../api/endpoints.js';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PAYMENT_MODES, MONTH_LABELS } from '../utils/constants.js';
import { formatCurrency } from '../utils/format.js';

/**
 * BulkCollectModal — accept a lump-sum / advance payment for a student.
 * The backend distributes it oldest-first across pending/partial months,
 * and generates a single bulk receipt.
 *
 * Props:
 *   open           – boolean
 *   student        – student object
 *   fees           – array of fee records for this student/year
 *   academicYearId – string
 *   onClose        – () => void
 *   onDone         – (result) => void
 */
export default function BulkCollectModal({ open, student, fees = [], academicYearId, onClose, onDone }) {
  const { toast } = useUI();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [collectedBy, setCollectedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    userApi.listSubAdmins().then((subs) => {
      const all = [];
      if (user?.name) all.push({ _id: 'self', name: user.name });
      (subs || []).forEach((s) => { if (s.name !== user?.name) all.push({ _id: s._id, name: s.name }); });
      setStaffList(all);
    }).catch(() => {});
  }, [user]); // settlement preview before confirming

  // Total outstanding across all pending/partial months
  const totalPending = useMemo(
    () => fees.filter((f) => f.status !== 'paid').reduce((s, f) => s + f.remainingAmount, 0),
    [fees]
  );

  // Preview: simulate how the entered amount would be distributed
  const settlement = useMemo(() => {
    const MONTH_ORDER = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
    const outstanding = fees
      .filter((f) => f.status !== 'paid' && f.remainingAmount > 0)
      .sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month));
    let budget = Number(amount) || 0;
    return outstanding.map((f) => {
      const apply = Math.min(budget, f.remainingAmount);
      budget = Math.max(0, budget - apply);
      return { month: f.month, monthlyFee: f.monthlyFee, remaining: f.remainingAmount, apply, budget };
    }).filter((r) => r.apply > 0);
  }, [fees, amount]);

  useEffect(() => {
    if (open) {
      setAmount('');
      setPaymentMode('cash');
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setCollectedBy(user?.name || '');
      setPreview(null);
    }
  }, [open, user]);

  if (!student) return null;

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    setSubmitting(true);
    try {
      const res = await feeApi.bulkCollect({
        studentId: student._id,
        academicYearId,
        amount: amt,
        paymentMode,
        paymentDate,
        notes,
        collectedBy,
      });
      const months = res.settled?.length || 0;
      toast.success(`₹${formatCurrency(res.totalApplied)} applied across ${months} month${months !== 1 ? 's' : ''}`);
      onDone?.(res);
      onClose?.();
    } catch (e) {
      toast.error(e.normalizedMessage || 'Bulk payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Bulk / Advance Payment"
      size="md"
      footer={
        <>
          <button className="btn btn-outline btn-md" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-secondary btn-md" onClick={submit} disabled={submitting || !amount}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
            Apply Payment
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Student + total pending summary */}
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
          <ReadOnly label="Student" value={student.name} span />
          <ReadOnly label="Monthly Fee" value={formatCurrency(student.monthlyFee)} />
          <ReadOnly label="Total Pending" value={formatCurrency(totalPending)} highlight />
        </div>

        {/* Amount shortcuts */}
        <div>
          <label className="label">Amount to Pay <span className="text-danger">*</span></label>
          <div className="flex gap-2">
            <input
              type="number"
              className="input flex-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min={1}
            />
            <button
              type="button"
              className="btn btn-outline btn-md shrink-0"
              onClick={() => setAmount(String(student.monthlyFee))}
              title="Set to one month's fee"
            >
              1 Month
            </button>
            <button
              type="button"
              className="btn btn-outline btn-md shrink-0"
              onClick={() => setAmount(String(totalPending))}
              title="Pay all pending"
            >
              Pay All
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Payment Mode</label>
            <select className="input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Payment Date</label>
            <input type="date" className="input" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Collected By <span className="text-danger">*</span></label>
            {staffList.length > 1 ? (
              <select className="input" value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)}>
                <option value="">— Select staff —</option>
                {staffList.map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
              </select>
            ) : (
              <input className="input" value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} placeholder="Staff name" />
            )}
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        {/* Live settlement preview */}
        {settlement.length > 0 && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-accent">
              <CheckCircle2 size={13} /> Auto-distribution preview (oldest first)
            </p>
            <div className="space-y-1.5">
              {settlement.map((s) => (
                <div key={s.month} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                  <span className="font-medium text-text-primary">{MONTH_LABELS[s.month] || s.month}</span>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span>Due: {formatCurrency(s.remaining)}</span>
                    <span className={`font-semibold ${s.apply >= s.remaining ? 'text-success' : 'text-warning'}`}>
                      → Pay: {formatCurrency(s.apply)} {s.apply >= s.remaining ? '✓ Full' : '⚡ Partial'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {Number(amount) > totalPending && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                <AlertTriangle size={13} />
                Amount exceeds total pending ({formatCurrency(totalPending)}). Only {formatCurrency(totalPending)} will be applied.
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ReadOnly({ label, value, highlight, span }) {
  return (
    <div className={span ? 'col-span-1' : ''}>
      <p className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`font-semibold ${highlight ? 'text-danger' : 'text-text-primary'}`}>{value}</p>
    </div>
  );
}
