import { useState, useEffect, useCallback } from 'react';
import {
  ReceiptText,
  Plus,
  Pencil,
  Trash2,
  Printer,
  Eye,
  Search,
  IndianRupee,
  Loader2,
  Calendar,
  User,
  MessageCircle,
  Download,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ManualReceiptTemplate from '../components/ManualReceiptTemplate.jsx';
import { manualReceiptApi, studentApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { formatCurrency, formatDate } from '../utils/format.js';
import { MONTHS, MONTH_LABELS, PAYMENT_MODES } from '../utils/constants.js';
import { downloadReceiptPdf, shareReceiptOnWhatsApp } from '../utils/receiptPdf.js';
import { exportToExcel } from '../utils/exporters.js';

export default function ManualReceipts() {
  const { user } = useAuth();
  const { toast } = useUI();
  
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null); // stores receipt ID for print/view
  const [toDelete, setToDelete] = useState(null);
  
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await manualReceiptApi.list({ page, limit: 10, search });
      setData(res.data || []);
      setMeta(res.meta || null);
    } catch (e) {
      toast.error(e.normalizedMessage || 'Failed to load manual receipts');
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    try {
      await manualReceiptApi.remove(toDelete._id);
      toast.success('Manual receipt deleted');
      setToDelete(null);
      load();
    } catch (e) {
      toast.error(e.normalizedMessage || 'Failed to delete receipt');
    }
  };

  const doExport = () => {
    if (!data.length) return toast.warning('Nothing to export');
    exportToExcel('manual-receipts', [
      { key: 'receiptNumber', label: 'Receipt #' },
      { key: 'student.name',  label: 'Student' },
      { key: 'student.class', label: 'Class' },
      { key: 'amount',        label: 'Amount' },
      { key: 'paymentMode',   label: 'Mode' },
      { key: 'collectedBy',   label: 'Collected By' },
      { key: 'receiptDate',   label: 'Date', format: (d) => formatDate(d) },
    ], data, 'Manual Receipts');
    toast.success('Exported manual receipts');
  };

  const columns = [
    {
      key: 'receiptNumber',
      header: 'Receipt #',
      render: (r) => <span className="font-mono font-semibold text-primary">{r.receiptNumber}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      render: (r) => (
        <div>
          <p className="font-medium text-text-primary">{r.student?.name}</p>
          <p className="text-xs text-text-secondary">
            Class {r.student?.class || '—'}{r.student?.section ? ` - ${r.student.section}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => <span className="font-mono font-semibold">{formatCurrency(r.amount)}</span>,
    },
    {
      key: 'paymentMode',
      header: 'Mode',
      render: (r) => <span className="uppercase text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{r.paymentMode}</span>,
    },
    {
      key: 'collectedBy',
      header: 'Collected By',
      render: (r) => r.collectedBy || '—',
    },
    {
      key: 'date',
      header: 'Date',
      render: (r) => <span className="text-text-secondary">{formatDate(r.receiptDate)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button className="btn btn-ghost btn-sm px-2 text-primary" onClick={() => setViewing(r._id)} title="View / Print"><Eye size={15} /></button>
          <button className="btn btn-ghost btn-sm px-2 text-secondary" onClick={() => setEditing(r)} title="Edit"><Pencil size={15} /></button>
          <button className="btn btn-ghost btn-sm px-2 text-danger" onClick={() => setToDelete(r)} title="Delete"><Trash2 size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manual Receipts"
        subtitle="Issue and manage custom manual receipts"
        icon={ReceiptText}
        actions={
          <button className="btn btn-secondary btn-md" onClick={() => setCreating(true)}>
            <Plus size={16} /> Create Receipt
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          icon={ReceiptText}
          label="Total Manual Receipts"
          value={meta?.total || 0}
          color="text-primary"
          bg="bg-primary/10"
        />
        <SummaryCard
          icon={IndianRupee}
          label="Total Amount Collected"
          value={formatCurrency(meta?.totalAmount || 0)}
          color="text-success"
          bg="bg-success/10"
        />
        <div className="card p-5 flex items-start gap-3 border border-amber-200 bg-amber-50/50 sm:col-span-2 lg:col-span-1">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold text-amber-900">Important Note</p>
            <p>Manual receipts are independent billing entries. They do not update automated pending fees or general fee collections reports.</p>
          </div>
        </div>
      </div>

      {/* Filter Bar & Export */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search receipt number or student name..."
              className="input pl-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button className="btn btn-outline btn-md w-full sm:w-auto" onClick={doExport}>
            <FileSpreadsheet size={15} /> Export Excel
          </button>
        </div>

        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          meta={meta}
          onPageChange={setPage}
          onRowClick={(r) => setViewing(r._id)}
          empty={
            <EmptyState
              icon={ReceiptText}
              title="No manual receipts"
              message="No manual receipts found matching your query."
              action={
                <button className="btn btn-primary btn-md" onClick={() => setCreating(true)}>
                  <Plus size={16} /> Create Receipt
                </button>
              }
            />
          }
        />
      </div>

      {/* Modals */}
      <FormModal open={creating} onClose={() => setCreating(false)} onSaved={load} currentUser={user} />
      <FormModal open={!!editing} receipt={editing} onClose={() => setEditing(null)} onSaved={load} currentUser={user} />
      <PrintModal open={!!viewing} receiptId={viewing} onClose={() => setViewing(null)} />
      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Delete manual receipt?"
        message={`Are you sure you want to delete manual receipt ${toDelete?.receiptNumber}? This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}

/* ─── Stats Card ─────────────────────────────────────────────────── */
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

/* ─── Form Modal (Create / Edit) ─────────────────────────────────── */
function FormModal({ open, receipt, onClose, onSaved, currentUser }) {
  const { toast } = useUI();
  
  const [saving, setSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [form, setForm] = useState({
    amount: '',
    paymentMode: 'cash',
    collectedBy: currentUser?.name || '',
    month: '',
    receiptDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setErrors({});
      if (receipt) {
        setSelectedStudent(receipt.student);
        setStudentSearch(receipt.student?.name || '');
        setForm({
          amount: receipt.amount,
          paymentMode: receipt.paymentMode,
          collectedBy: receipt.collectedBy,
          month: receipt.month || '',
          receiptDate: new Date(receipt.receiptDate).toISOString().split('T')[0],
          remarks: receipt.remarks || '',
        });
      } else {
        setSelectedStudent(null);
        setStudentSearch('');
        setForm({
          amount: '',
          paymentMode: 'cash',
          collectedBy: currentUser?.name || '',
          month: '',
          receiptDate: new Date().toISOString().split('T')[0],
          remarks: '',
        });
      }
    }
  }, [open, receipt, currentUser]);

  // Handle student search suggestions
  useEffect(() => {
    if (studentSearch.trim().length < 2 || selectedStudent) {
      setStudentSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const res = await studentApi.list({ search: studentSearch, status: 'active', limit: 8 });
        setStudentSuggestions(res.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingStudents(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [studentSearch, selectedStudent]);

  const setField = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async () => {
    const errs = {};
    if (!selectedStudent) errs.student = 'Please select a student';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Amount must be greater than 0';
    if (!form.collectedBy.trim()) errs.collectedBy = 'Collector name is required';
    if (!form.receiptDate) errs.receiptDate = 'Date is required';
    
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        studentId: selectedStudent._id,
        amount: Number(form.amount),
        paymentMode: form.paymentMode,
        collectedBy: form.collectedBy,
        month: form.month,
        receiptDate: form.receiptDate,
        remarks: form.remarks,
      };

      if (receipt) {
        await manualReceiptApi.update(receipt._id, payload);
        toast.success('Manual receipt updated');
      } else {
        await manualReceiptApi.create(payload);
        toast.success('Manual receipt created');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.normalizedMessage || 'Failed to save manual receipt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={receipt ? `Edit Receipt ${receipt.receiptNumber}` : 'Create Manual Receipt'}
      size="md"
      footer={
        <>
          <button className="btn btn-outline btn-md" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-secondary btn-md" onClick={submit} disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {receipt ? 'Save Changes' : 'Generate Receipt'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Student Autocomplete Search */}
        <div className="relative">
          <label className="label">Select Student <span className="text-danger">*</span></label>
          {selectedStudent ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="font-semibold text-text-primary">{selectedStudent.name}</p>
                <p className="text-xs text-text-secondary">
                  Class {selectedStudent.class || '—'} · Father: {selectedStudent.fatherName || '—'}
                </p>
              </div>
              {!receipt && (
                <button
                  type="button"
                  className="text-xs font-semibold text-primary hover:underline"
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentSearch('');
                  }}
                >
                  Change
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Type student name or mobile..."
                  className={`input pl-10 ${errors.student ? 'input-error' : ''}`}
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                {searchingStudents && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                )}
              </div>
              
              {studentSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {studentSuggestions.map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      className="flex w-full flex-col px-4 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      onClick={() => {
                        setSelectedStudent(s);
                        setStudentSearch(s.name);
                        setStudentSuggestions([]);
                      }}
                    >
                      <span className="font-medium text-text-primary text-sm">{s.name}</span>
                      <span className="text-xs text-text-secondary">
                        Class {s.class} · Father: {s.fatherName} · Route: {s.routeId?.routeName || '—'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {errors.student && <p className="field-error">{errors.student}</p>}
        </div>

        {/* Amount and Collected By */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (₹)" required error={errors.amount}>
            <input
              type="number"
              className={`input ${errors.amount ? 'input-error' : ''}`}
              value={form.amount}
              onChange={(e) => setField('amount', e.target.value)}
              placeholder="e.g. 1500"
            />
          </Field>

          <Field label="Collected By" required error={errors.collectedBy}>
            <input
              type="text"
              className={`input ${errors.collectedBy ? 'input-error' : ''}`}
              value={form.collectedBy}
              onChange={(e) => setField('collectedBy', e.target.value)}
              placeholder="Staff / Admin Name"
            />
          </Field>
        </div>

        {/* Date and Month */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Receipt Date" required error={errors.receiptDate}>
            <input
              type="date"
              className="input"
              value={form.receiptDate}
              onChange={(e) => setField('receiptDate', e.target.value)}
            />
          </Field>

          <Field label="Month (Optional)">
            <select
              className="input"
              value={form.month}
              onChange={(e) => setField('month', e.target.value)}
            >
              <option value="">No Month Tag</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {MONTH_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Payment Mode */}
        <Field label="Payment Mode">
          <select
            className="input"
            value={form.paymentMode}
            onChange={(e) => setField('paymentMode', e.target.value)}
          >
            {PAYMENT_MODES.map((pm) => (
              <option key={pm.value} value={pm.value}>
                {pm.label}
              </option>
            ))}
          </select>
        </Field>

        {/* Remarks / Notes */}
        <Field label="Remarks / Notes">
          <textarea
            className="input min-h-[80px] py-2"
            value={form.remarks}
            onChange={(e) => setField('remarks', e.target.value)}
            placeholder="Add any specific comments, cheque details, or custom notes..."
          />
        </Field>
      </div>
    </Modal>
  );
}

/* ─── Print Modal ────────────────────────────────────────────────── */
function PrintModal({ receiptId, open, onClose }) {
  const { toast } = useUI();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [waLoading, setWaLoading] = useState(false);

  useEffect(() => {
    if (!open || !receiptId) return;
    let mounted = true;
    setLoading(true);
    manualReceiptApi
      .get(receiptId)
      .then((d) => mounted && setData(d))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [open, receiptId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!data?.receipt) return;
    setPdfLoading(true);
    try {
      await downloadReceiptPdf(data.receipt.receiptNumber);
    } catch (e) {
      console.error('PDF generation failed', e);
      window.print();
    } finally {
      setPdfLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!data?.receipt) return;
    const r = data.receipt;
    const student = r.studentId || {};
    setWaLoading(true);
    try {
      await shareReceiptOnWhatsApp({
        receiptNumber: r.receiptNumber,
        studentName: student.name,
        month: r.month ? MONTH_LABELS[r.month] || r.month : 'Custom Payment',
        amount: r.amount,
        mobile: student.mobile,
        companyName: data.settings?.company?.name,
      });
    } catch (e) {
      console.error('WhatsApp share failed', e);
      toast.error('Failed to open WhatsApp');
    } finally {
      setWaLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Print Manual Receipt"
      size="md"
      footer={
        <>
          <button
            className="btn btn-outline btn-md"
            onClick={handleWhatsApp}
            disabled={!data || waLoading}
            title="Downloads PDF then opens WhatsApp"
          >
            {waLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
            WhatsApp
          </button>
          <button
            className="btn btn-outline btn-md"
            onClick={handleDownload}
            disabled={!data || pdfLoading}
          >
            {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </button>
          <button className="btn btn-primary btn-md" onClick={handlePrint} disabled={!data}>
            <Printer size={16} /> Print
          </button>
        </>
      }
    >
      {loading || !data ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-accent" />
        </div>
      ) : (
        <>
          <ManualReceiptTemplate receipt={data.receipt} settings={data.settings} />
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-text-secondary">
            📎 WhatsApp will download the PDF first — attach it in WhatsApp after it opens.
          </p>
        </>
      )}
    </Modal>
  );
}

/* ─── Field Helper ───────────────────────────────────────────────── */
function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
