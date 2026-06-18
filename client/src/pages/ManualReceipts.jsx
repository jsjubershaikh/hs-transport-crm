import { useState, useEffect, useCallback, useMemo } from 'react';
import { FilePlus, Eye, MessageCircle, Trash2, Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import FilterBar from '../components/FilterBar.jsx';
import DataTable from '../components/DataTable.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ManualReceiptBuilder from '../components/ManualReceiptBuilder.jsx';
import ManualReceiptModal from '../components/ManualReceiptModal.jsx';
import { manualReceiptApi } from '../api/endpoints.js';
import { useUI } from '../context/UIContext.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';

export default function ManualReceipts() {
  const { toast } = useUI();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [builderOpen, setBuilderOpen] = useState(false);
  const [viewId, setViewId] = useState(null);

  const params = useMemo(() => ({ page, limit: 20, search: search || undefined }), [page, search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await manualReceiptApi.list(params);
      setData(res.data || []);
      setMeta(res.meta || null);
    } catch (e) {
      toast.error(e.normalizedMessage || 'Failed to load manual receipts');
    } finally {
      setLoading(false);
    }
  }, [params, toast]);

  useEffect(() => { load(); }, [load]);

  const studentOf = (r) => r.studentId || r.studentSnapshot || {};

  const shareWa = (r) => {
    const s = studentOf(r);
    const text = `Receipt ${r.receiptNumber}: ${formatCurrency(r.amount)}. - HS School Bus`;
    window.open(`https://wa.me/91${s.mobile || ''}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete manual receipt ${r.receiptNumber}? This cannot be undone.`)) return;
    try {
      await manualReceiptApi.remove(r._id);
      toast.success('Manual receipt deleted');
      load();
    } catch (e) {
      toast.error(e.normalizedMessage || 'Failed to delete');
    }
  };

  const columns = [
    { key: 'receiptNumber', header: 'Receipt #', render: (r) => <span className="font-mono font-semibold text-primary">{r.receiptNumber}</span> },
    {
      key: 'student', header: 'Student',
      render: (r) => {
        const s = studentOf(r);
        return <div><p className="font-medium text-text-primary">{s.name || '—'}</p><p className="text-xs text-text-secondary">{s.class ? `Class ${s.class}` : ''}{s.mobile ? ` · ${s.mobile}` : ''}</p></div>;
      },
    },
    { key: 'items', header: 'Items', render: (r) => <span className="text-text-secondary">{r.items?.length || 0} item{(r.items?.length || 0) !== 1 ? 's' : ''}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="font-mono font-semibold text-success">{formatCurrency(r.amount)}</span> },
    { key: 'date', header: 'Date', render: (r) => <span className="text-text-secondary">{formatDate(r.paymentDate || r.generatedAt)}</span> },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm px-2" onClick={() => setViewId(r._id)} title="View"><Eye size={15} /></button>
          <button className="btn btn-ghost btn-sm px-2 text-success" onClick={() => shareWa(r)} title="WhatsApp"><MessageCircle size={15} /></button>
          <button className="btn btn-ghost btn-sm px-2 text-danger" onClick={() => remove(r)} title="Delete"><Trash2 size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Manual Receipts"
        subtitle="Custom receipts on request — separate from fees, no ledger impact"
        icon={FilePlus}
        actions={
          <button className="btn btn-primary btn-md" onClick={() => setBuilderOpen(true)}>
            <Plus size={16} /> Create Manual Receipt
          </button>
        }
      />

      <FilterBar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search receipt # or student…"
        filters={[]}
      />

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onRowClick={(r) => setViewId(r._id)}
        empty={<EmptyState icon={FilePlus} title="No manual receipts yet" message="Create a manual receipt when a parent asks for a custom one." />}
      />

      <ManualReceiptBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onCreated={(created) => {
          setBuilderOpen(false);
          load();
          if (created?._id) setViewId(created._id);
        }}
      />

      <ManualReceiptModal open={!!viewId} receiptId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}
