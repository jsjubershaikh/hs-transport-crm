import { useState, useEffect } from 'react';
import { Loader2, IndianRupee } from 'lucide-react';
import Modal from './Modal.jsx';
import { feeApi, userApi } from '../api/endpoints.js';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { PAYMENT_MODES, MONTH_LABELS } from '../utils/constants.js';
import { formatCurrency } from '../utils/format.js';

export default function CollectFeeModal({ open, fee, studentName, onClose, onDone }) {
  const { toast } = useUI();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [collectedBy, setCollectedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [staffList, setStaffList] = useState([]);

  // Load all users (admin + sub-admins) for the Collected By dropdown
  useEffect(() => {
    userApi.listSubAdmins().then((subs) => {
      const all = [];
      if (user?.name) all.push({ _id: 'self', name: user.name });
      (subs || []).forEach((s) => { if (s.name !== user?.name) all.push({ _id: s._id, name: s.name }); });
      setStaffList(all);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (open && fee) {
      setAmount(String(fee.remainingAmount ?? ''));
      setPaymentMode('cash');
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setCollectedBy(user?.name || '');
    }
  }, [open, fee, user]);

  if (!fee) return null;
  const name = studentName || fee.student?.name || fee.studentName || 'Student';

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (amt > fee.remainingAmount) return toast.error(`Max payable is ${formatCurrency(fee.remainingAmount)}`);
    setSubmitting(true);
    try {
      const res = await feeApi.collect(fee._id, { amount: amt, paymentMode, paymentDate, notes, collectedBy });
      if (res.feeRecord?.status === 'partial') toast.warning('Fee is partially paid');
      else toast.success('Payment collected & receipt generated');
      onDone?.(res);
      onClose?.();
    } catch (e) {
      toast.error(e.normalizedMessage || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Collect Payment"
      size="md"
      footer={
        <>
          <button className="btn btn-outline btn-md" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary btn-md" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <IndianRupee size={16} />}
            Submit Payment
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
          <ReadOnly label="Student" value={name} />
          <ReadOnly label="Month" value={MONTH_LABELS[fee.month] || fee.month} />
          <ReadOnly label="Monthly Fee" value={formatCurrency(fee.monthlyFee)} />
          <ReadOnly label="Remaining" value={formatCurrency(fee.remainingAmount)} highlight />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Amount Paying <span className="text-danger">*</span></label>
            <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} max={fee.remainingAmount} />
          </div>
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
          <div className="sm:col-span-2">
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
      <p className={`font-semibold ${highlight ? 'text-danger' : 'text-text-primary'}`}>{value}</p>
    </div>
  );
}
