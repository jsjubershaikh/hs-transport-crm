import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, ReceiptText, ChevronLeft, ChevronRight,
  IndianRupee, User, FileSpreadsheet, Eye, Printer, MessageCircle,
  CheckCircle2, Clock, ShieldCheck, BadgeCheck,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import FilterBar from '../components/FilterBar.jsx';
import DataTable from '../components/DataTable.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ReceiptModal from '../components/ReceiptModal.jsx';
import { reportApi, receiptApi } from '../api/endpoints.js';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../hooks/useRealtime.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { MONTHS, MONTH_LABELS } from '../utils/constants.js';
import { exportToExcel } from '../utils/exporters.js';

/** Format a Date as YYYY-MM-DD in local timezone */
function toLocalDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

const TABS = ['Daily Collection', 'Receipts'];

export default function DailyCollection() {
  const [tab, setTab] = useState('Daily Collection');

  return (
    <div>
      <PageHeader title="Daily Collection" subtitle="Collection summary and all receipts" icon={TrendingUp} />

      {/* Tab switcher */}
      <div className="mb-5 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition ${
              tab === t ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'Daily Collection' ? <TrendingUp size={15} /> : <ReceiptText size={15} />}
            {t}
            {tab === t && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-accent" />}
          </button>
        ))}
      </div>

      {tab === 'Daily Collection' && <DailyTab />}
      {tab === 'Receipts'         && <ReceiptsTab />}
    </div>
  );
}

/* ─── Daily Collection Tab ───────────────────────────────────────── */
function DailyTab() {
  const { toast } = useUI();
  const { isSuperAdmin } = useAuth();
  const [date, setDate] = useState(() => toLocalDate(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null); // collectorName being verified

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await reportApi.dailyCollection(date));
    } catch (e) {
      toast.error(e.normalizedMessage || 'Failed to load daily collection');
    } finally { setLoading(false); }
  }, [date, toast]);

  useEffect(() => { load(); }, [load]);

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(toLocalDate(d)); };
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); if (d <= new Date()) setDate(toLocalDate(d)); };
  const isToday = date === toLocalDate(new Date());

  const exportData = () => {
    if (!data?.receipts?.length) return toast.warning('Nothing to export');
    exportToExcel(`daily-collection-${date}`, [
      { key: 'receiptNumber',    label: 'Receipt #' },
      { key: 'studentId.name',   label: 'Student' },
      { key: 'studentId.class',  label: 'Class' },
      { key: 'studentId.mobile', label: 'Mobile' },
      { key: 'routeId.routeName',label: 'Route' },
      { key: 'month',            label: 'Month', format: (m) => MONTH_LABELS[m] || m },
      { key: 'amount',           label: 'Amount' },
      { key: 'collectedBy',      label: 'Collected By' },
      { key: 'receiptType',      label: 'Type' },
    ], data.receipts, 'Daily Collection');
    toast.success(`Exported ${data.receipts.length} receipts`);
  };

  /** Superadmin clicks the verify (✓) button for a collector */
  const handleVerify = async (collector) => {
    if (verifying) return;
    const confirmed = window.confirm(
      `Confirm that you have received ₹${collector.total.toLocaleString('en-IN')} in cash from ${collector.name}?`
    );
    if (!confirmed) return;

    setVerifying(collector.name);
    try {
      await reportApi.verifyCollection({
        date,
        collectorName: collector.name,
        amount: collector.total,
        receiptCount: collector.count,
      });
      toast.success(`Cash from ${collector.name} verified! Notification sent.`, 4000);
      // Optimistically update the collector row
      setData((prev) => ({
        ...prev,
        byCollector: prev.byCollector.map((c) =>
          c.name === collector.name
            ? { ...c, isVerified: true, verifiedAt: new Date().toISOString() }
            : c
        ),
      }));
    } catch (e) {
      toast.error(e.normalizedMessage || 'Verification failed');
    } finally {
      setVerifying(null);
    }
  };

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const allVerified = data?.byCollector?.length > 0 && data.byCollector.every((c) => c.isVerified);

  return (
    <div className="space-y-5">
      {/* Date navigator */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-white shadow-sm">
          <button onClick={prevDay} className="rounded-l-xl p-2.5 text-text-secondary hover:bg-slate-50 hover:text-primary transition">
            <ChevronLeft size={18} />
          </button>
          <input
            type="date"
            className="border-0 bg-transparent px-2 py-2 text-sm font-semibold text-text-primary focus:outline-none"
            value={date}
            max={toLocalDate(new Date())}
            onChange={(e) => setDate(e.target.value)}
          />
          <button onClick={nextDay} disabled={isToday} className="rounded-r-xl p-2.5 text-text-secondary hover:bg-slate-50 hover:text-primary transition disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={18} />
          </button>
        </div>
        <span className="text-sm font-medium text-text-secondary">{displayDate}</span>
        <div className="ml-auto">
          <button className="btn btn-outline btn-md" onClick={exportData} disabled={!data?.receipts?.length}>
            <FileSpreadsheet size={15} /> Export
          </button>
        </div>
      </div>

      {loading ? <LoadingSpinner label="Loading collection…" /> : !data || data.receiptCount === 0 ? (
        <div className="card">
          <EmptyState icon={TrendingUp} title="No collections on this day" message="No fees were collected on the selected date." />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <SummaryCard icon={IndianRupee} label="Total Collected"     value={formatCurrency(data.totalCollected)} color="text-success" bg="bg-success/10" />
            <SummaryCard icon={ReceiptText}  label="Receipts Generated" value={data.receiptCount}                   color="text-primary" bg="bg-primary/10" />
            <SummaryCard icon={User}         label="Collectors"          value={data.byCollector.length}            color="text-accent"  bg="bg-accent/10"  />
          </div>

          {/* By collector — with verification */}
          {data.byCollector.length > 0 && (
            <div className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-text-secondary">
                  Collection by Staff
                </h3>
                {isSuperAdmin && (
                  <div className="flex items-center gap-2">
                    {allVerified ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                        <ShieldCheck size={13} /> All Cash Received
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 border border-amber-200">
                        <Clock size={12} /> Pending Verification
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {data.byCollector.map((c) => (
                  <div
                    key={c.name}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all ${
                      c.isVerified
                        ? 'bg-success/5 border border-success/20'
                        : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                        c.isVerified ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'
                      }`}>
                        {c.isVerified
                          ? <BadgeCheck size={18} />
                          : c.name.charAt(0).toUpperCase()
                        }
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">{c.name}</p>
                        <p className="text-xs text-text-secondary">
                          {c.count} receipt{c.count !== 1 ? 's' : ''}
                          {c.isVerified && c.verifiedAt && (
                            <span className="ml-2 text-success font-medium">
                              · Verified {new Date(c.verifiedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-heading text-lg font-bold text-success">{formatCurrency(c.total)}</span>

                      {/* Verify button — superadmin only */}
                      {isSuperAdmin && (
                        c.isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
                            <CheckCircle2 size={13} /> Received
                          </span>
                        ) : (
                          <button
                            onClick={() => handleVerify(c)}
                            disabled={verifying === c.name}
                            title={`Mark cash received from ${c.name}`}
                            className="group inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {verifying === c.name ? (
                              <>
                                <span className="h-3 w-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                                Verifying…
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={13} className="group-hover:scale-110 transition-transform" />
                                Mark Received
                              </>
                            )}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}

                {/* Grand total */}
                {data.byCollector.length > 1 && (
                  <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success/5 px-4 py-3 mt-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-sm font-bold text-success">
                        Σ
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary">Total (All Staff)</p>
                        <p className="text-xs text-text-secondary">{data.receiptCount} receipt{data.receiptCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <span className="font-heading text-xl font-bold text-success">{formatCurrency(data.totalCollected)}</span>
                  </div>
                )}
              </div>

              {/* Superadmin helper note */}
              {isSuperAdmin && !allVerified && data.byCollector.some((c) => !c.isVerified) && (
                <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-700">
                  💡 Click <strong>Mark Received</strong> next to each collector after they hand you the cash. The collector will be notified instantly.
                </p>
              )}
            </div>
          )}

          {/* Receipts table */}
          <div className="card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <h3 className="font-heading text-sm font-bold text-text-primary">All Receipts — {data.receiptCount} total</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    <th className="px-4 py-3">Receipt #</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Collected By</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.receipts.map((r) => (
                    <tr key={r._id} className="border-b border-border/70 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-primary">{r.receiptNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{r.studentId?.name || '—'}</p>
                        <p className="text-xs text-text-secondary">{r.studentId?.class ? `Class ${r.studentId.class}` : ''}{r.studentId?.mobile ? ` · ${r.studentId.mobile}` : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{r.routeId?.routeName || '—'}</td>
                      <td className="px-4 py-3">
                        {r.receiptType === 'bulk'
                          ? <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">{r.bulkDetails?.length || '?'} months</span>
                          : MONTH_LABELS[r.month] || r.month || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-success">{formatCurrency(r.amount)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-text-primary">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {(r.collectedBy || r.generatedBy?.name || '?').charAt(0).toUpperCase()}
                          </span>
                          {r.collectedBy || r.generatedBy?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.receiptType === 'bulk' ? 'bg-accent/10 text-accent' : 'bg-success/10 text-success'}`}>
                          {r.receiptType === 'bulk' ? 'Advance' : 'Monthly'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {new Date(r.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


/* ─── Receipts Tab ───────────────────────────────────────────────── */
function ReceiptsTab() {
  const { routes } = useData();
  const { toast } = useUI();
  const { isSuperAdmin } = useAuth();

  const [search, setSearch]   = useState('');
  const [month, setMonth]     = useState('');
  const [routeId, setRouteId] = useState('');
  const [page, setPage]       = useState(1);
  const [viewId, setViewId]   = useState(null);
  const [data, setData]       = useState([]);
  const [meta, setMeta]       = useState(null);
  const [loading, setLoading] = useState(true);

  const params = useMemo(
    () => ({ page, limit: 20, search: search || undefined, month: month || undefined, routeId: routeId || undefined }),
    [page, search, month, routeId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receiptApi.list(params);
      setData(res.data || []);
      setMeta(res.meta || null);
    } finally { setLoading(false); }
  }, [params]);

  useEffect(() => { load(); }, [load]);
  useRealtime(['receipt:created'], load);

  const resetPage = (fn) => (v) => { fn(v); setPage(1); };

  const shareWa = (r) => {
    const s = r.student || {};
    const text = `Receipt ${r.receiptNumber} for ${MONTH_LABELS[r.month] || r.month}: ${formatCurrency(r.amount)} paid. - HS Transportation`;
    window.open(`https://wa.me/91${s.mobile}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const doExport = () => {
    if (!data.length) return toast.warning('Nothing to export');
    exportToExcel('receipts', [
      { key: 'receiptNumber', label: 'Receipt #' },
      { key: 'student.name',  label: 'Student' },
      { key: 'student.class', label: 'Class' },
      { key: 'month',         label: 'Month', format: (m) => MONTH_LABELS[m] || m },
      { key: 'amount',        label: 'Amount' },
      { key: 'generatedAt',   label: 'Date', format: (d) => formatDate(d) },
    ], data, 'Receipts');
    toast.success('Exported receipts');
  };

  const columns = [
    { key: 'receiptNumber', header: 'Receipt #',   render: (r) => <span className="font-mono font-semibold text-primary">{r.receiptNumber}</span> },
    { key: 'student',       header: 'Student',     render: (r) => <div><p className="font-medium text-text-primary">{r.student?.name}</p><p className="text-xs text-text-secondary">Class {r.student?.class}</p></div> },
    { key: 'month',         header: 'Month',       render: (r) => MONTH_LABELS[r.month] || r.month },
    { key: 'amount',        header: 'Amount', align: 'right', render: (r) => <span className="font-mono font-semibold">{formatCurrency(r.amount)}</span> },
    { key: 'date',          header: 'Date',        render: (r) => <span className="text-text-secondary">{formatDate(r.generatedAt)}</span> },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button className="btn btn-ghost btn-sm px-2" onClick={() => setViewId(r._id)} title="View"><Eye size={15} /></button>
          <button className="btn btn-ghost btn-sm px-2" onClick={() => setViewId(r._id)} title="Print"><Printer size={15} /></button>
          <button className="btn btn-ghost btn-sm px-2 text-success" onClick={() => shareWa(r)} title="WhatsApp"><MessageCircle size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn btn-outline btn-md" onClick={doExport}>
          <FileSpreadsheet size={15} /> Export
        </button>
      </div>

      <FilterBar
        search={search}
        onSearch={resetPage(setSearch)}
        searchPlaceholder="Search receipt # or student…"
        filters={[
          { key: 'month', value: month, onChange: resetPage(setMonth), placeholder: 'All Months', options: MONTHS.map((m) => ({ value: m, label: MONTH_LABELS[m] })) },
          ...(isSuperAdmin ? [{ key: 'route', value: routeId, onChange: resetPage(setRouteId), placeholder: 'All Routes', options: routes.map((r) => ({ value: r._id, label: r.routeName })) }] : []),
        ]}
      />

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onRowClick={(r) => setViewId(r._id)}
        empty={<EmptyState icon={ReceiptText} title="No receipts found" message="Receipts appear here as fees are collected." />}
      />

      <ReceiptModal open={!!viewId} receiptId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bg}`}>
        <Icon size={22} className={color} />
      </div>
      <div>
        <p className="text-xs text-text-secondary">{label}</p>
        <p className={`mt-0.5 font-heading text-xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}
