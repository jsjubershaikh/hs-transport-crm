import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, IndianRupee, Phone, Layers, Eye, CheckCircle2,
  AlertCircle, Loader2, FileSpreadsheet,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import ReceiptModal from '../components/ReceiptModal.jsx';
import { feeApi } from '../api/endpoints.js';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';
import { MONTH_LABELS, PAYMENT_MODES, MONTHS } from '../utils/constants.js';
import { exportToExcel } from '../utils/exporters.js';

export default function Families() {
  const navigate = useNavigate();
  const { selectedYearId, toast } = useUI();

  const [mobile, setMobile] = useState('');
  const [family, setFamily] = useState(null);
  const [searching, setSearching] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [viewReceipt, setViewReceipt] = useState(null);

  const search = useCallback(async () => {
    if (!/^[0-9]{10}$/.test(mobile)) return toast.error('Enter a valid 10-digit mobile number');
    setSearching(true);
    setFamily(null);
    try {
      const data = await feeApi.familyFees({ mobile, academicYearId: selectedYearId });
      setFamily(data);
    } catch (e) {
      toast.error(e.normalizedMessage || 'Family not found');
    } finally {
      setSearching(false);
    }
  }, [mobile, selectedYearId, toast]);

  const exportFamily = () => {
    if (!family) return;
    const rows = family.members.flatMap((m) =>
      m.fees.map((f) => ({
        studentName: m.student.name,
        class: m.student.class,
        month: MONTH_LABELS[f.month] || f.month,
        monthlyFee: f.monthlyFee,
        paid: f.paidAmount,
        remaining: f.remainingAmount,
        status: f.status,
        paymentDate: f.paymentDate ? formatDate(f.paymentDate) : '—',
        mode: f.paymentMode || '—',
      }))
    );
    exportToExcel(`family-${mobile}`, [
      { key: 'studentName', label: 'Student' },
      { key: 'class', label: 'Class' },
      { key: 'month', label: 'Month' },
      { key: 'monthlyFee', label: 'Monthly Fee' },
      { key: 'paid', label: 'Paid' },
      { key: 'remaining', label: 'Remaining' },
      { key: 'status', label: 'Status' },
      { key: 'paymentDate', label: 'Payment Date' },
      { key: 'mode', label: 'Mode' },
    ], rows, 'Family Fees');
    toast.success('Exported family fee report');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Family Fee Management"
        subtitle="Collect fees for all children of one family in a single payment"
        icon={Users}
      />

      {/* Search bar */}
      <div className="card p-5">
        <p className="mb-3 text-sm text-text-secondary">
          Enter the <strong>father's mobile number</strong> to find all children from the same family.
        </p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              className="input pl-9"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Father's 10-digit mobile"
              maxLength={10}
              onKeyDown={(e) => e.key === 'Enter' && search()}
            />
          </div>
          <button className="btn btn-secondary btn-md" onClick={search} disabled={searching}>
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search Family
          </button>
        </div>
      </div>

      {/* Family results */}
      {family && (
        <>
          {/* Family summary bar */}
          <div className="card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users size={20} />
                  </span>
                  <div>
                    <h2 className="font-heading text-lg font-bold text-text-primary">
                      {family.familyName}'s Family
                    </h2>
                    <p className="text-sm text-text-secondary">
                      {family.studentCount} student{family.studentCount !== 1 ? 's' : ''} · {mobile}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-xl bg-danger/5 px-4 py-2 text-center">
                  <p className="text-xs text-text-secondary">Total Pending</p>
                  <p className="font-heading text-lg font-bold text-danger">{formatCurrency(family.grandTotalPending)}</p>
                </div>
                <div className="rounded-xl bg-success/5 px-4 py-2 text-center">
                  <p className="text-xs text-text-secondary">Total Paid</p>
                  <p className="font-heading text-lg font-bold text-success">{formatCurrency(family.grandTotalPaid)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-outline btn-md" onClick={exportFamily}>
                  <FileSpreadsheet size={15} /> Export
                </button>
                {family.grandTotalPending > 0 && (
                  <button className="btn btn-primary btn-md" onClick={() => setCollectOpen(true)}>
                    <Layers size={15} /> Collect Family Fees
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Per-student fee cards */}
          <div className="space-y-4">
            {family.members.map(({ student, fees, totalPending, totalPaid }) => (
              <div key={student._id} className="card overflow-hidden">
                {/* Student header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={student.photo} name={student.name} size="sm" />
                    <div>
                      <p className="font-semibold text-text-primary">{student.name}</p>
                      <p className="text-xs text-text-secondary">
                        Class {student.class} ·{' '}
                        {student.routeId?.routeName || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${totalPending > 0 ? 'text-danger' : 'text-success'}`}>
                      {totalPending > 0 ? `${formatCurrency(totalPending)} due` : '✓ All paid'}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm px-2"
                      onClick={() => navigate(`/app/students/${student._id}`)}
                      title="View profile"
                    >
                      <Eye size={15} />
                    </button>
                  </div>
                </div>

                {/* Fee month grid */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        <th className="px-4 py-2">Month</th>
                        <th className="px-4 py-2 text-right">Fee</th>
                        <th className="px-4 py-2 text-right">Paid</th>
                        <th className="px-4 py-2 text-right">Due</th>
                        <th className="px-4 py-2 text-center">Status</th>
                        <th className="px-4 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.map((f) => (
                        <tr key={f._id} className="border-t border-border/50 hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-medium">{MONTH_LABELS[f.month] || f.month}</td>
                          <td className="px-4 py-2 text-right font-mono">{formatCurrency(f.monthlyFee)}</td>
                          <td className="px-4 py-2 text-right font-mono text-success">{formatCurrency(f.paidAmount)}</td>
                          <td className="px-4 py-2 text-right font-mono text-danger">{formatCurrency(f.remainingAmount)}</td>
                          <td className="px-4 py-2 text-center"><Badge variant={f.status} /></td>
                          <td className="px-4 py-2 text-text-secondary text-xs">{f.paymentDate ? formatDate(f.paymentDate) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-slate-50 font-semibold">
                        <td className="px-4 py-2 text-xs uppercase text-text-secondary">Total</td>
                        <td className="px-4 py-2 text-right font-mono">{formatCurrency(fees.reduce((s,f)=>s+f.monthlyFee,0))}</td>
                        <td className="px-4 py-2 text-right font-mono text-success">{formatCurrency(totalPaid)}</td>
                        <td className="px-4 py-2 text-right font-mono text-danger">{formatCurrency(totalPending)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Family Collect Modal */}
      {family && (
        <FamilyCollectModal
          open={collectOpen}
          family={family}
          mobile={mobile}
          academicYearId={selectedYearId}
          onClose={() => setCollectOpen(false)}
          onDone={async () => {
            setCollectOpen(false);
            // Refresh family data
            try {
              const data = await feeApi.familyFees({ mobile, academicYearId: selectedYearId });
              setFamily(data);
            } catch {}
          }}
          onViewReceipt={(id) => setViewReceipt(id)}
        />
      )}

      <ReceiptModal open={!!viewReceipt} receiptId={viewReceipt} onClose={() => setViewReceipt(null)} />
    </div>
  );
}

function FamilyCollectModal({ open, family, mobile, academicYearId, onClose, onDone, onViewReceipt }) {
  const { toast } = useUI();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [collectedBy, setCollectedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setAmount('');
      setPaymentMode('cash');
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setCollectedBy(user?.name || '');
      setResult(null);
    }
  }, [open, user]);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    setSubmitting(true);
    try {
      const res = await feeApi.familyCollect({
        mobile,
        academicYearId,
        amount: amt,
        paymentMode,
        paymentDate,
        notes,
        collectedBy,
      });
      setResult(res);
      toast.success(`₹${formatCurrency(res.totalApplied)} collected for ${family.familyName}'s family`);
    } catch (e) {
      toast.error(e.normalizedMessage || 'Collection failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : result ? () => { setResult(null); onDone?.(); } : onClose}
      title="Collect Family Fees"
      size="lg"
      footer={
        result ? (
          <button className="btn btn-secondary btn-md w-full" onClick={() => { setResult(null); onDone?.(); }}>
            <CheckCircle2 size={16} /> Done
          </button>
        ) : (
          <>
            <button className="btn btn-outline btn-md" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="btn btn-primary btn-md" onClick={submit} disabled={submitting || !amount}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <IndianRupee size={16} />}
              Collect Payment
            </button>
          </>
        )
      }
    >
      {result ? (
        // Success state
        <div className="space-y-4">
          <div className="rounded-xl bg-success/5 p-5 text-center">
            <CheckCircle2 className="mx-auto mb-2 text-success" size={40} />
            <p className="font-heading text-xl font-bold text-success">₹{formatCurrency(result.totalApplied)} Collected</p>
            <p className="mt-1 text-sm text-text-secondary">
              {result.studentsCount} student{result.studentsCount !== 1 ? 's' : ''} · {result.settled.length} months settled
            </p>
          </div>

          {/* Settled breakdown */}
          <div className="max-h-56 overflow-y-auto space-y-1">
            {result.settled.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">{s.studentName}</span>
                <span className="text-text-secondary">{MONTH_LABELS[s.month] || s.month}</span>
                <span className="font-mono text-success">{formatCurrency(s.amount)}</span>
              </div>
            ))}
          </div>

          {result.receipt?._id && (
            <button
              className="btn btn-outline btn-md w-full"
              onClick={() => onViewReceipt?.(result.receipt._id)}
            >
              View Family Receipt
            </button>
          )}
        </div>
      ) : (
        // Input form
        <div className="space-y-4">
          {/* Family summary */}
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
            <ReadOnly label="Family" value={family.familyName} />
            <ReadOnly label="Students" value={family.studentCount} />
            <ReadOnly label="Total Pending" value={formatCurrency(family.grandTotalPending)} highlight />
          </div>

          {/* Distribution preview per student */}
          <div className="rounded-xl border border-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-text-secondary">Pending per student</p>
            <div className="space-y-1.5">
              {family.members.map(({ student, totalPending }) => (
                <div key={student._id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-primary">{student.name}</span>
                  <span className={totalPending > 0 ? 'font-mono text-danger' : 'text-success text-xs'}>
                    {totalPending > 0 ? formatCurrency(totalPending) : '✓ All paid'}
                  </span>
                </div>
              ))}
            </div>
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
              <button type="button" className="btn btn-outline btn-md shrink-0" onClick={() => setAmount(String(family.grandTotalPending))}>
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
              <label className="label">Collected By</label>
              <input className="input" value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} placeholder="Staff name" />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <p className="rounded-lg bg-accent/5 px-3 py-2 text-xs text-accent">
            💡 Payment is distributed student by student, oldest month first. Each student gets individual monthly receipts + one family bulk receipt.
          </p>
        </div>
      )}
    </Modal>
  );
}

function ReadOnly({ label, value, highlight }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`font-semibold ${highlight ? 'text-danger' : 'text-text-primary'}`}>{value || '—'}</p>
    </div>
  );
}
