import { useState, useMemo, useEffect } from 'react';
import { Wallet, IndianRupee, AlertCircle, Users, CheckCircle2, Send, FileSpreadsheet, MessageCircle, Loader2, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import FilterBar from '../components/FilterBar.jsx';
import DataTable from '../components/DataTable.jsx';
import Badge from '../components/Badge.jsx';
import StatCard from '../components/StatCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import CollectFeeModal from '../components/CollectFeeModal.jsx';
import Modal from '../components/Modal.jsx';
import { SkeletonCards } from '../components/Skeleton.jsx';
import { useFees, useFeeOverview } from '../hooks/useFees.js';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { feeApi } from '../api/endpoints.js';
import { exportToExcel } from '../utils/exporters.js';
import { formatCurrency } from '../utils/format.js';
import { MONTHS, MONTH_LABELS, CLASSES } from '../utils/constants.js';

export default function FeeManagement() {
  const { routes } = useData();
  const { selectedYearId, toast } = useUI();
  const { isSuperAdmin } = useAuth();

  const [month, setMonth] = useState('');
  const [routeId, setRouteId] = useState('');
  const [cls, setCls] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [collectFee, setCollectFee] = useState(null);
  const [reminderOpen, setReminderOpen] = useState(false);

  const params = useMemo(
    () => ({ page, limit: 20, month: month || undefined, routeId: routeId || undefined, class: cls || undefined, status: status || undefined, academicYearId: selectedYearId || undefined, search: search || undefined }),
    [page, month, routeId, cls, status, selectedYearId, search]
  );

  const { data, meta, loading, refetch } = useFees(params);
  const { data: overview, loading: ovLoading } = useFeeOverview({ academicYearId: selectedYearId, month: month || undefined });

  const resetPage = (fn) => (v) => { fn(v); setPage(1); };

  // Debounce the search so we don't fire a request on every keystroke
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);
  const toggleRow = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = (checked) => setSelected(checked ? data.map((d) => d._id) : []);

  const selectedRows = data.filter((d) => selected.includes(d._id));

  const exportSelected = () => {
    const rows = selectedRows.length ? selectedRows : data;
    if (!rows.length) return toast.warning('Nothing to export');
    exportToExcel('fees', [
      { key: 'student.name', label: 'Student' },
      { key: 'student.class', label: 'Class' },
      { key: 'route.routeName', label: 'Route' },
      { key: 'month', label: 'Month', format: (m) => MONTH_LABELS[m] || m },
      { key: 'monthlyFee', label: 'Monthly Fee' },
      { key: 'paidAmount', label: 'Paid' },
      { key: 'remainingAmount', label: 'Remaining' },
      { key: 'status', label: 'Status' },
    ], rows, 'Fees');
    toast.success(`Exported ${rows.length} rows`);
  };

  const rowClass = (r) =>
    r.status === 'paid' ? 'bg-success/[0.04] hover:bg-success/[0.08]'
      : r.status === 'partial' ? 'bg-warning/[0.05] hover:bg-warning/[0.1]'
      : 'bg-danger/[0.04] hover:bg-danger/[0.08]';

  const columns = [
    { key: 'student', header: 'Student', render: (r) => <div><p className="font-medium text-text-primary">{r.student?.name}</p><p className="text-xs text-text-secondary">Class {r.student?.class}</p></div> },
    { key: 'route', header: 'Route', render: (r) => <span className="text-text-secondary">{r.route?.routeName || '—'}</span> },
    { key: 'month', header: 'Month', render: (r) => MONTH_LABELS[r.month] || r.month },
    { key: 'monthlyFee', header: 'Fee', align: 'right', render: (r) => <span className="font-mono">{formatCurrency(r.monthlyFee)}</span> },
    { key: 'paidAmount', header: 'Paid', align: 'right', render: (r) => <span className="font-mono text-success">{formatCurrency(r.paidAmount)}</span> },
    { key: 'remainingAmount', header: 'Remaining', align: 'right', render: (r) => <span className="font-mono text-danger">{formatCurrency(r.remainingAmount)}</span> },
    { key: 'status', header: 'Status', align: 'center', render: (r) => <Badge variant={r.status} /> },
    {
      key: 'action', header: 'Action', align: 'right',
      render: (r) => r.remainingAmount > 0
        ? <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); setCollectFee(r); }}><IndianRupee size={14} /> Collect</button>
        : <span className="text-xs font-medium text-success">Paid ✓</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Fee Management" subtitle="Collect and track transport fees" icon={Wallet} />

      {/* Overview cards */}
      {ovLoading || !overview ? (
        <div className="mb-6"><SkeletonCards count={4} /></div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={IndianRupee} label="This Month Collected" value={overview.currentMonthCollection} currency variant="green" />
          <StatCard icon={AlertCircle} label="Total Pending" value={overview.totalPending} currency variant="red" />
          <StatCard icon={Users} label="Students with Dues" value={overview.studentsWithDues} variant="orange" />
          <StatCard icon={CheckCircle2} label="Fully Paid Students" value={overview.fullyPaidStudents} variant="teal" />
        </div>
      )}

      {/* Student search bar */}
      <div className="mb-3 relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          className="input pl-9 max-w-sm"
          placeholder="Search student name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <FilterBar
        filters={[
          { key: 'month', value: month, onChange: resetPage(setMonth), placeholder: 'All Months', options: MONTHS.map((m) => ({ value: m, label: MONTH_LABELS[m] })) },
          ...(isSuperAdmin ? [{ key: 'route', value: routeId, onChange: resetPage(setRouteId), placeholder: 'All Routes', options: routes.map((r) => ({ value: r._id, label: r.routeName })) }] : []),
          { key: 'class', value: cls, onChange: resetPage(setCls), placeholder: 'All Classes', options: CLASSES.map((c) => ({ value: c, label: c })) },
          { key: 'status', value: status, onChange: resetPage(setStatus), placeholder: 'All Status', options: [{ value: 'paid', label: 'Paid' }, { value: 'partial', label: 'Partial' }, { value: 'pending', label: 'Pending' }] },
        ]}
        right={
          <>
            <button className="btn btn-outline btn-sm" disabled={!selectedRows.length} onClick={() => setReminderOpen(true)}><Send size={15} /> Send Reminder{selectedRows.length ? ` (${selectedRows.length})` : ''}</button>
            <button className="btn btn-outline btn-sm" onClick={exportSelected}><FileSpreadsheet size={15} /> Export</button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        selectable
        selectedIds={selected}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        rowClassName={rowClass}
        empty={<EmptyState icon={Wallet} title="No fee records" message="No payments recorded for this filter." />}
      />

      <CollectFeeModal open={!!collectFee} fee={collectFee} studentName={collectFee?.student?.name} onClose={() => setCollectFee(null)} onDone={() => { refetch(); setSelected([]); }} />
      <BulkReminderModal open={reminderOpen} rows={selectedRows} onClose={() => setReminderOpen(false)} />
    </div>
  );
}

/** Bulk WhatsApp/SMS reminder modal — sends reminder to all selected students with dues. */
function BulkReminderModal({ open, rows, onClose }) {
  const { toast } = useUI();
  const [channel, setChannel] = useState('whatsapp');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);   // prepared messages from API
  const [step, setStep] = useState('preview');    // 'preview' | 'sending' | 'done'
  const [sentCount, setSentCount] = useState(0);

  const due = rows.filter((r) => r.remainingAmount > 0);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) { setStep('preview'); setMessages([]); setSentCount(0); }
  }, [open]);

  const prepare = async () => {
    if (!due.length) return toast.warning('Selected rows have no dues');
    setSending(true);
    try {
      const res = await feeApi.reminders({ feeRecordIds: due.map((r) => r._id), channel });
      setMessages(res.messages || []);
      setStep('sending');
    } catch (e) {
      toast.error(e.normalizedMessage || 'Failed to prepare reminders');
    } finally {
      setSending(false);
    }
  };

  // Open WhatsApp links one-by-one with a 1.2s gap so the browser doesn't block them
  const sendAll = async () => {
    setSentCount(0);
    for (let i = 0; i < messages.length; i++) {
      window.open(messages[i].waLink, '_blank');
      setSentCount(i + 1);
      if (i < messages.length - 1) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
    setStep('done');
    toast.success(`${messages.length} WhatsApp reminder${messages.length === 1 ? '' : 's'} sent`);
  };

  const openSingle = (waLink) => window.open(waLink, '_blank');

  return (
    <Modal
      open={open}
      onClose={sending ? undefined : onClose}
      title="Send Fee Reminders"
      size="md"
      footer={
        step === 'preview' ? (
          <>
            <button className="btn btn-outline btn-md" onClick={onClose} disabled={sending}>Cancel</button>
            <button className="btn btn-primary btn-md" onClick={prepare} disabled={sending || !due.length}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
              Prepare {due.length} Reminder{due.length !== 1 ? 's' : ''}
            </button>
          </>
        ) : step === 'sending' ? (
          <>
            <button className="btn btn-outline btn-md" onClick={onClose}>Close</button>
            <button className="btn btn-primary btn-md" onClick={sendAll}>
              <MessageCircle size={16} /> Send All on WhatsApp ({messages.length})
            </button>
          </>
        ) : (
          <button className="btn btn-secondary btn-md w-full" onClick={onClose}>
            <CheckCircle2 size={16} /> Done — {sentCount} sent
          </button>
        )
      }
    >
      <div className="space-y-4">
        {/* Step 1 — preview */}
        {step === 'preview' && (
          <>
            <div className="flex gap-2">
              {['whatsapp', 'sms'].map((c) => (
                <button key={c} onClick={() => setChannel(c)}
                  className={`flex-1 rounded-input border px-3 py-2 text-sm font-medium capitalize transition ${channel === c ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text-secondary'}`}>{c}</button>
              ))}
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-text-secondary">
              <p className="mb-1 text-xs font-semibold uppercase">Message template</p>
              <p className="italic">Dear Parent of <b>{'{studentName}'}</b>, Transport fee for <b>{'{month}'}</b> is ₹<b>{'{remaining}'}</b> pending. Kindly pay at earliest. - HS School Bus</p>
            </div>
            <div className="max-h-52 space-y-1.5 overflow-y-auto">
              {due.map((r) => (
                <div key={r._id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-text-primary">{r.student?.name}</p>
                    <p className="text-xs text-text-secondary">{r.student?.mobile}</p>
                  </div>
                  <span className="text-danger font-mono text-sm">{formatCurrency(r.remainingAmount)} · {MONTH_LABELS[r.month] || r.month}</span>
                </div>
              ))}
              {!due.length && <p className="py-4 text-center text-sm text-text-secondary">No dues in selection.</p>}
            </div>
          </>
        )}

        {/* Step 2 — send queue */}
        {step === 'sending' && (
          <>
            <div className="flex items-center gap-2.5 rounded-xl border border-accent/30 bg-accent/5 p-3.5 text-sm text-accent">
              <MessageCircle size={16} className="shrink-0" />
              <p>Click <strong>"Send All on WhatsApp"</strong> to open each student's WhatsApp chat one by one. Keep this tab active while sending.</p>
            </div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={m.feeRecordId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary">{m.studentName}</p>
                    <p className="truncate text-xs text-text-secondary">{m.message}</p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <span className="font-mono text-xs text-danger">{formatCurrency(m.remaining)}</span>
                    <button
                      className="btn btn-ghost btn-sm px-2 text-success"
                      onClick={() => openSingle(m.waLink)}
                      title="Open WhatsApp for this student"
                    >
                      <MessageCircle size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-text-secondary">
              Or click the <MessageCircle size={11} className="inline" /> icon next to each student to send individually.
            </p>
          </>
        )}

        {/* Step 3 — done */}
        {step === 'done' && (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 size={28} />
            </div>
            <p className="font-heading text-lg font-bold text-text-primary">All Reminders Sent!</p>
            <p className="mt-1 text-sm text-text-secondary">
              {sentCount} WhatsApp reminder{sentCount !== 1 ? 's' : ''} opened successfully.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
