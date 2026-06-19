import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Printer, Phone, MapPin, Bus, Route as RouteIcon,
  CalendarRange, Loader2, MessageCircle, Eye, Layers, CalendarX, UserX, UserCheck,
} from 'lucide-react';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FeeStatusGrid from '../components/FeeStatusGrid.jsx';
import CollectFeeModal from '../components/CollectFeeModal.jsx';
import EditFeeModal from '../components/EditFeeModal.jsx';
import BulkCollectModal from '../components/BulkCollectModal.jsx';
import AdjustFeesModal from '../components/AdjustFeesModal.jsx';
import InactiveModal from '../components/InactiveModal.jsx';
import ReceiptModal from '../components/ReceiptModal.jsx';
import EditStudentModal from '../components/EditStudentModal.jsx';
import { printStudentIdCard } from '../components/StudentIdCard.jsx';
import { studentApi, settingsApi } from '../api/endpoints.js';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../hooks/useRealtime.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { MONTH_LABELS } from '../utils/constants.js';

const TABS = ['Profile', 'Fees', 'Receipts', 'Bulk Receipts', 'Academic History'];

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedYearId, toast } = useUI();
  const { isSuperAdmin } = useAuth();

  const [student, setStudent] = useState(null);
  const [fees, setFees] = useState([]);
  const [receipts, setReceipts] = useState([]);       // monthly only
  const [bulkReceipts, setBulkReceipts] = useState([]); // bulk only
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Profile');

  // Load company settings once (for ID card header)
  useEffect(() => {
    settingsApi.get().then(setSettings).catch(() => {});
  }, []);

  const [collectFee, setCollectFee] = useState(null);
  const [editFee, setEditFee] = useState(null);
  const [bulkPay, setBulkPay] = useState(false);
  const [adjustFees, setAdjustFees] = useState(false);
  const [inactiveModal, setInactiveModal] = useState(null); // 'deactivate' | 'rejoin'
  const [viewReceipt, setViewReceipt] = useState(null);
  const [editing, setEditing] = useState(false);

  // Find receipt id for a fee row — receipts are indexed by receiptNumber on the fee record
  const getReceiptForFee = useCallback(async (fee) => {
    if (fee.receiptId) return fee.receiptId;
    const match = receipts.find((r) => r.receiptNumber && r.receiptNumber === fee.receiptNumber);
    if (match) return match._id;
    try {
      const fresh = await studentApi.receipts(id, 'monthly');
      const m = fresh.find((r) => r.receiptNumber === fee.receiptNumber);
      return m?._id || null;
    } catch { return null; }
  }, [receipts, id]);

  const load = useCallback(async () => {
    try {
      const [s, f, r, br, h] = await Promise.all([
        studentApi.get(id),
        studentApi.fees(id, selectedYearId),
        studentApi.receipts(id, 'monthly'),
        studentApi.receipts(id, 'bulk'),
        studentApi.history(id),
      ]);
      setStudent(s); setFees(f); setReceipts(r); setBulkReceipts(br); setHistory(h);
    } catch (e) {
      toast.error(e.normalizedMessage || 'Failed to load student');
      navigate('/app/students');
    } finally {
      setLoading(false);
    }
  }, [id, selectedYearId, navigate, toast]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useRealtime(['fee:updated', 'receipt:created', 'student:updated'], load);

  if (loading || !student) return <LoadingSpinner label="Loading profile…" />;

  const totals = fees.reduce(
    (a, f) => ({ fee: a.fee + f.monthlyFee, paid: a.paid + f.paidAmount, pending: a.pending + f.remainingAmount }),
    { fee: 0, paid: 0, pending: 0 }
  );
  const counts = fees.reduce((a, f) => ({ ...a, [f.status]: (a[f.status] || 0) + 1 }), {});

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/app/students')} className="flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-primary">
        <ArrowLeft size={16} /> Back to students
      </button>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar src={student.photo} name={student.name} size="xl" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-text-primary">{student.name}</h1>
              <Badge variant={student.status === 'active' ? 'active' : 'inactive'} />
            </div>
            <p className="mt-0.5 text-sm text-text-secondary">S/o {student.fatherName} · Class {student.class}-{student.section} · {student.school}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Tag icon={RouteIcon}>{student.routeId?.routeName || '—'}</Tag>
              <Tag icon={Bus}>{student.busId?.busNumber || '—'}</Tag>
              <Tag icon={CalendarRange}>{student.academicYearId?.label || '—'}</Tag>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-outline btn-md" onClick={() => setEditing(true)}><Pencil size={16} /> Edit</button>
            {student.status === 'active' ? (
              <button className="btn btn-outline btn-md text-warning hover:border-warning hover:bg-warning/5" onClick={() => setInactiveModal('deactivate')}>
                <UserX size={16} /> Mark Inactive
              </button>
            ) : (
              <button className="btn btn-outline btn-md text-success hover:border-success hover:bg-success/5" onClick={() => setInactiveModal('rejoin')}>
                <UserCheck size={16} /> Rejoin
              </button>
            )}
            <button className="btn btn-ghost btn-md" onClick={() => printStudentIdCard(student, settings)} title="Print Student ID Card">
              <Printer size={16} /> Print ID
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 py-2.5 text-sm font-semibold transition ${tab === t ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-accent" />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Profile' && <ProfileTab student={student} />}

      {tab === 'Fees' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryStat label="Total Fees (11mo)" value={formatCurrency(totals.fee)} />
            <SummaryStat label="Total Paid" value={formatCurrency(totals.paid)} color="text-success" />
            <SummaryStat label="Total Pending" value={formatCurrency(totals.pending)} color="text-danger" />
            <SummaryStat label="Paid / Partial / Pending" value={`${counts.paid || 0} / ${counts.partial || 0} / ${counts.pending || 0}`} />
          </div>
          {/* Bulk Pay action bar */}
          {totals.pending > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">Total Pending: <span className="text-danger">{formatCurrency(totals.pending)}</span></p>
                <p className="text-xs text-text-secondary">Pay multiple months at once with advance / bulk payment</p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-outline btn-md shrink-0" onClick={() => setAdjustFees(true)}>
                  <CalendarX size={15} /> Adjust Months
                </button>
                <button className="btn btn-primary btn-md shrink-0" onClick={() => setBulkPay(true)}>
                  <Layers size={15} /> Advance Pay
                </button>
              </div>
            </div>
          )}
          <div className="card overflow-hidden">
            <FeeStatusGrid
              fees={fees}
              student={student}
              isSuperAdmin={isSuperAdmin}
              onCollect={(f) => setCollectFee(f)}
              onEdit={(f) => setEditFee(f)}
              onReceipt={async (f) => {
                const rid = await getReceiptForFee(f);
                if (rid) setViewReceipt(rid);
                else toast.error('Receipt not found');
              }}
            />
          </div>
        </div>
      )}

      {tab === 'Receipts' && (
        <div className="card overflow-hidden">
          {receipts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    <th className="px-4 py-3">Receipt #</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r._id} className="border-b border-border/70 last:border-0 hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-primary">{r.receiptNumber}</td>
                      <td className="px-4 py-3">{MONTH_LABELS[r.month] || r.month}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.amount)}</td>
                      <td className="px-4 py-3 text-text-secondary">{formatDate(r.generatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="btn btn-ghost btn-sm px-2" onClick={() => setViewReceipt(r._id)} title="View"><Eye size={15} /></button>
                          <button className="btn btn-ghost btn-sm px-2" onClick={() => setViewReceipt(r._id)} title="Print"><Printer size={15} /></button>
                          <button
                            className="btn btn-ghost btn-sm px-2 text-success"
                            title="WhatsApp"
                            onClick={() => window.open(`https://wa.me/91${student.mobile}?text=${encodeURIComponent(`Receipt ${r.receiptNumber} for ${MONTH_LABELS[r.month] || r.month}: ${formatCurrency(r.amount)} - HS School Bus`)}`, '_blank')}
                          >
                            <MessageCircle size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No receipts yet" message="Receipts appear here once fees are collected." />
          )}
        </div>
      )}

      {tab === 'Bulk Receipts' && (
        <div className="card overflow-hidden">
          {bulkReceipts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    <th className="px-4 py-3">Receipt #</th>
                    <th className="px-4 py-3">Months Covered</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkReceipts.map((r) => (
                    <tr key={r._id} className="border-b border-border/70 last:border-0 hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-primary">{r.receiptNumber}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                          <Layers size={11} /> {r.bulkDetails?.length || '—'} months
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(r.amount)}</td>
                      <td className="px-4 py-3 text-text-secondary">{formatDate(r.generatedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="btn btn-ghost btn-sm px-2" onClick={() => setViewReceipt(r._id)} title="View Receipt"><Eye size={15} /></button>
                          <button className="btn btn-ghost btn-sm px-2" onClick={() => setViewReceipt(r._id)} title="Print"><Printer size={15} /></button>
                          <button
                            className="btn btn-ghost btn-sm px-2 text-success"
                            title="WhatsApp"
                            onClick={() => window.open(`https://wa.me/91${student.mobile}?text=${encodeURIComponent(`Bulk fee receipt ${r.receiptNumber}: ${formatCurrency(r.amount)} paid for ${r.bulkDetails?.length || ''} months - HS School Bus`)}`, '_blank')}
                          >
                            <MessageCircle size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No bulk receipts" message="Bulk / advance payments will appear here." />
          )}
        </div>
      )}

      {tab === 'Academic History' && (
        <div className="card p-5">
          {history.length ? (
            <ol className="relative space-y-5 border-l-2 border-border pl-6">
              {history.map((h) => (
                <li key={h.studentId} className="relative">
                  <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-accent ring-4 ring-white" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-heading font-bold text-text-primary">{h.academicYear?.label || '—'}</p>
                      <p className="text-sm text-text-secondary">Class {h.class}-{h.section} · {h.status}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-success">{formatCurrency(h.totalPaid)} paid</p>
                      <p className="text-danger">{formatCurrency(h.totalPending)} pending</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No academic history" message="History builds up as the student is promoted each year." />
          )}
        </div>
      )}

      <CollectFeeModal open={!!collectFee} fee={collectFee} studentName={student.name} onClose={() => setCollectFee(null)} onDone={load} />
      <EditFeeModal open={!!editFee} fee={editFee} studentName={student.name} onClose={() => setEditFee(null)} onDone={load} />
      <BulkCollectModal
        open={bulkPay}
        student={student}
        fees={fees}
        academicYearId={student.academicYearId?._id || student.academicYearId}
        onClose={() => setBulkPay(false)}
        onDone={load}
      />
      <AdjustFeesModal
        open={adjustFees}
        student={student}
        fees={fees}
        academicYearId={student.academicYearId?._id || student.academicYearId}
        onClose={() => setAdjustFees(false)}
        onDone={load}
      />
      <ReceiptModal open={!!viewReceipt} receiptId={viewReceipt} onClose={() => setViewReceipt(null)} />
      <EditStudentModal open={editing} student={student} onClose={() => setEditing(false)} onSaved={load} />
      <InactiveModal
        open={!!inactiveModal}
        mode={inactiveModal}
        student={student}
        fees={fees}
        academicYearId={student.academicYearId?._id || student.academicYearId}
        onClose={() => setInactiveModal(null)}
        onDone={load}
        onInactivated={() => navigate('/app/alumni')}
        onRejoined={() => navigate('/app/students')}
      />
    </div>
  );
}

function ProfileTab({ student }) {
  const siblings = student.siblings || [];
  const hasSiblings = siblings.length > 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <DetailCard title="Personal">
          <Detail label="Full Name" value={student.name} />
          <Detail label="Father's Name" value={student.fatherName} />
          <Detail label="Mother's Name" value={student.motherName} />
          <Detail label="Gender" value={student.gender} />
          <Detail label="Date of Birth" value={student.dob ? formatDate(student.dob) : '—'} />
          <Detail label="Mobile" value={student.mobile} icon={Phone} />
          {student.altMobile && <Detail label="Alt Mobile" value={student.altMobile} icon={Phone} />}
          <Detail label="Address" value={student.address || '—'} icon={MapPin} />
        </DetailCard>
        <div className="space-y-5">
          <DetailCard title="Academic">
            <Detail label="Class" value={`${student.class} - ${student.section}`} />
            <Detail label="School" value={student.school} />
            <Detail label="Academic Year" value={student.academicYearId?.label} />
            <Detail label="Admission Date" value={formatDate(student.admissionDate)} />
          </DetailCard>
          <DetailCard title="Transport">
            <Detail label="Route" value={student.routeId?.routeName} />
            <Detail label="Bus" value={student.busId?.busNumber} />
            <Detail label="Pickup & Drop Point" value={student.pickupPoint} />
            {hasSiblings ? (
              <>
                <Detail label="Primary Fee" value={formatCurrency(student.baseFee || 0)} />
                <Detail label="Combined Fee" value={formatCurrency(student.monthlyFee)} />
              </>
            ) : (
              <Detail label="Monthly Fee" value={formatCurrency(student.monthlyFee)} />
            )}
          </DetailCard>
        </div>
      </div>

      {/* Siblings section */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base font-bold text-text-primary">
              Siblings
              {hasSiblings && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {siblings.length}
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-text-secondary">Click <strong>Edit</strong> → <strong>Siblings</strong> to manage</p>
        </div>

        {hasSiblings ? (
          <>
            <div className="space-y-3">
              {siblings.map((s, i) => (
                <div key={s._id || i} className="rounded-xl border border-border bg-slate-50/60 p-4">
                  <div className="flex items-start gap-4">
                    {/* Photo */}
                    {s.photo
                      ? <img src={s.photo} alt={s.name} className="h-14 w-14 shrink-0 rounded-xl object-cover ring-2 ring-white shadow" />
                      : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary shadow">
                          {s.name?.charAt(0)?.toUpperCase()}
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      {/* Name + badge */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <p className="font-heading font-bold text-text-primary">{s.name}</p>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Sibling {i + 1}
                        </span>
                      </div>
                      {/* Detail grid */}
                      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-3 text-xs">
                        {s.class && (
                          <div>
                            <p className="uppercase tracking-wide text-text-secondary">Class</p>
                            <p className="font-medium text-text-primary">{s.class}{s.section ? `-${s.section}` : ''}</p>
                          </div>
                        )}
                        {s.gender && (
                          <div>
                            <p className="uppercase tracking-wide text-text-secondary">Gender</p>
                            <p className="font-medium text-text-primary">{s.gender}</p>
                          </div>
                        )}
                        {s.monthlyFee > 0 && (
                          <div>
                            <p className="uppercase tracking-wide text-text-secondary">Monthly Fee</p>
                            <p className="font-medium text-success">{formatCurrency(s.monthlyFee)}</p>
                          </div>
                        )}
                        {s.dob && (
                          <div>
                            <p className="uppercase tracking-wide text-text-secondary">Date of Birth</p>
                            <p className="font-medium text-text-primary">{formatDate(s.dob)}</p>
                          </div>
                        )}
                        {s.admissionDate && (
                          <div>
                            <p className="uppercase tracking-wide text-text-secondary">Admission Date</p>
                            <p className="font-medium text-text-primary">{formatDate(s.admissionDate)}</p>
                          </div>
                        )}
                        {s.academicYearId?.label && (
                          <div>
                            <p className="uppercase tracking-wide text-text-secondary">Academic Year</p>
                            <p className="font-medium text-text-primary">{s.academicYearId.label}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Fee breakdown */}
            <div className="mt-4 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 text-sm">
              <p className="mb-2 font-semibold text-text-primary">Combined Fee Breakdown</p>
              <div className="space-y-1 text-text-secondary">
                <div className="flex justify-between">
                  <span>{student.name} (primary)</span>
                  <span className="font-mono">{formatCurrency(student.baseFee || 0)}</span>
                </div>
                {siblings.map((s, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{s.name || `Sibling ${i + 1}`}</span>
                    <span className="font-mono">{formatCurrency(s.monthlyFee || 0)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-primary/20 pt-1.5 font-semibold text-text-primary">
                  <span>Total Monthly</span>
                  <span className="font-mono text-success">{formatCurrency(student.monthlyFee)}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-5 text-center">
            <p className="text-sm text-text-secondary">No siblings added yet.</p>
            <p className="text-xs text-text-secondary">Use Edit → Siblings button to add family members and combine their fees.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailCard({ title, children }) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 font-heading text-base font-bold text-text-primary">{title}</h3>
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}
function Detail({ label, value, icon: Icon }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="flex items-center gap-1.5 font-medium text-text-primary">{Icon && <Icon size={13} className="text-text-secondary" />}{value || '—'}</p>
    </div>
  );
}
function Tag({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-text-secondary">
      <Icon size={13} /> {children}
    </span>
  );
}
function SummaryStat({ label, value, color = 'text-text-primary' }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={`mt-1 font-heading text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
