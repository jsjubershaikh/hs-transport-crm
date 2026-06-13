import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReceiptText, Eye, Printer, MessageCircle, FileSpreadsheet } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import FilterBar from '../components/FilterBar.jsx';
import DataTable from '../components/DataTable.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ReceiptModal from '../components/ReceiptModal.jsx';
import { receiptApi } from '../api/endpoints.js';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../hooks/useRealtime.js';
import { exportToExcel } from '../utils/exporters.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { MONTHS, MONTH_LABELS } from '../utils/constants.js';

export default function Receipts() {
  const navigate = useNavigate();
  const { routes } = useData();
  const { toast } = useUI();
  const { isSuperAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [routeId, setRouteId] = useState('');
  const [page, setPage] = useState(1);
  const [viewId, setViewId] = useState(null);

  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
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
    } finally {
      setLoading(false);
    }
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
      { key: 'student.name', label: 'Student' },
      { key: 'student.class', label: 'Class' },
      { key: 'month', label: 'Month', format: (m) => MONTH_LABELS[m] || m },
      { key: 'amount', label: 'Amount' },
      { key: 'generatedAt', label: 'Date', format: (d) => formatDate(d) },
    ], data, 'Receipts');
    toast.success('Exported receipts');
  };

  const columns = [
    { key: 'receiptNumber', header: 'Receipt #', render: (r) => <span className="font-mono font-semibold text-primary">{r.receiptNumber}</span> },
    { key: 'student', header: 'Student', render: (r) => <div><p className="font-medium text-text-primary">{r.student?.name}</p><p className="text-xs text-text-secondary">Class {r.student?.class}</p></div> },
    { key: 'month', header: 'Month', render: (r) => MONTH_LABELS[r.month] || r.month },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="font-mono font-semibold">{formatCurrency(r.amount)}</span> },
    { key: 'date', header: 'Date', render: (r) => <span className="text-text-secondary">{formatDate(r.generatedAt)}</span> },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button className="btn btn-ghost btn-sm px-2" onClick={() => setViewId(r._id)} title="View / Print"><Eye size={15} /></button>
          <button className="btn btn-ghost btn-sm px-2" onClick={() => setViewId(r._id)} title="Print"><Printer size={15} /></button>
          <button className="btn btn-ghost btn-sm px-2 text-success" onClick={() => shareWa(r)} title="WhatsApp"><MessageCircle size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Receipts"
        subtitle={meta ? `${meta.total} receipts generated` : 'All payment receipts'}
        icon={ReceiptText}
        actions={<button className="btn btn-outline btn-md" onClick={doExport}><FileSpreadsheet size={16} /> Export</button>}
      />

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
        empty={<EmptyState icon={ReceiptText} title="No receipts found" message="Receipts will appear here as fees are collected." />}
      />

      <ReceiptModal open={!!viewId} receiptId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}
