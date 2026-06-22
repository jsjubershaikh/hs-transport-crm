import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Trash2, Loader2, User, X } from 'lucide-react';
import Modal from './Modal.jsx';
import { studentApi, manualReceiptApi } from '../api/endpoints.js';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { formatCurrency } from '../utils/format.js';
import { MONTH_LABELS, PAYMENT_MODES } from '../utils/constants.js';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Build a manual receipt: pick a student, include any paid months and/or add
 * free-form line items, then generate. Does NOT affect fee records.
 */
export default function ManualReceiptBuilder({ open, onClose, onCreated }) {
  const { selectedYear } = useData();
  const { toast } = useUI();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState(null);

  const [fees, setFees] = useState([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [months, setMonths] = useState({}); // { [month]: { checked, amount } }
  const [customItems, setCustomItems] = useState([]); // [{ description, amount }]

  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [collectedBy, setCollectedBy] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset everything when the modal opens/closes.
  useEffect(() => {
    if (!open) return;
    setQuery(''); setResults([]); setStudent(null);
    setFees([]); setMonths({}); setCustomItems([]);
    setPaymentMode('cash'); setPaymentDate(todayStr()); setCollectedBy(''); setNote('');
  }, [open]);

  // Debounced student search.
  useEffect(() => {
    if (!open || student || query.trim().length < 2) { setResults([]); return undefined; }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await studentApi.list({ search: query.trim(), limit: 8 });
        if (active) setResults(res.data || []);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [query, open, student]);

  const pickStudent = useCallback(async (s) => {
    setStudent(s);
    setQuery(''); setResults([]);
    setLoadingFees(true);
    try {
      const data = await studentApi.fees(s._id, selectedYear?._id);
      setFees(data || []);
    } catch {
      setFees([]);
    } finally {
      setLoadingFees(false);
    }
  }, [selectedYear]);

  const paidMonths = useMemo(() => fees.filter((f) => Number(f.paidAmount) > 0), [fees]);

  const toggleMonth = (f) => {
    setMonths((prev) => {
      const next = { ...prev };
      if (next[f.month]) delete next[f.month];
      else next[f.month] = { checked: true, amount: Number(f.paidAmount) || 0 };
      return next;
    });
  };
  const setMonthAmount = (month, amount) =>
    setMonths((prev) => ({ ...prev, [month]: { ...prev[month], amount } }));

  const addCustom = () => setCustomItems((p) => [...p, { description: '', amount: '' }]);
  const setCustom = (i, key, val) =>
    setCustomItems((p) => p.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  const removeCustom = (i) => setCustomItems((p) => p.filter((_, idx) => idx !== i));

  // Build the final item list.
  const items = useMemo(() => {
    const monthItems = Object.entries(months).map(([month, v]) => ({
      description: `Transport Fee — ${MONTH_LABELS[month] || month}`,
      month,
      amount: Number(v.amount) || 0,
    }));
    const custom = customItems
      .map((it) => ({ description: String(it.description || '').trim(), month: '', amount: Number(it.amount) || 0 }))
      .filter((it) => it.description || it.amount);
    return [...monthItems, ...custom];
  }, [months, customItems]);

  const total = useMemo(() => items.reduce((s, it) => s + (Number(it.amount) || 0), 0), [items]);

  const valid = useMemo(() => {
    if (!student) return false;
    const usable = items.filter((it) => it.description && Number(it.amount) > 0);
    return usable.length > 0;
  }, [student, items]);

  const submit = async () => {
    if (!valid || saving) return;
    const payload = {
      studentId: student._id,
      academicYearId: selectedYear?._id || undefined,
      items: items.filter((it) => it.description && Number(it.amount) > 0),
      paymentMode,
      paymentDate,
      collectedBy: collectedBy.trim(),
      note: note.trim(),
    };
    setSaving(true);
    try {
      const created = await manualReceiptApi.create(payload);
      toast.success('Manual receipt created');
      onCreated?.(created);
    } catch (e) {
      toast.error(e.normalizedMessage || 'Failed to create manual receipt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Manual Receipt"
      size="lg"
      footer={
        <>
          <div className="mr-auto text-sm">
            <span className="text-text-secondary">Total: </span>
            <span className="font-heading text-lg font-bold text-primary">{formatCurrency(total)}</span>
          </div>
          <button className="btn btn-outline btn-md" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary btn-md" onClick={submit} disabled={!valid || saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create Receipt
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Note banner */}
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          ⚠️ Manual receipts are documents only — they are <strong>not</strong> added to fee records and do not affect fee calculations or collection reports.
        </p>

        {/* Student picker */}
        <div>
          <label className="label">Student</label>
          {student ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-slate-50 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {(student.name || '?').charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{student.name}</p>
                  <p className="text-xs text-text-secondary">
                    Class {student.class}{student.mobile ? ` · ${student.mobile}` : ''}
                  </p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm px-2" onClick={() => { setStudent(null); setFees([]); setMonths({}); }} title="Change student">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  className="input pl-9"
                  placeholder="Search student by name…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              {(searching || results.length > 0) && (
                <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-white shadow-modal">
                  {searching && <div className="px-3 py-2.5 text-sm text-text-secondary">Searching…</div>}
                  {!searching && results.map((s) => (
                    <button
                      key={s._id}
                      onClick={() => pickStudent(s)}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50"
                    >
                      <User size={15} className="text-text-secondary" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{s.name}</p>
                        <p className="text-xs text-text-secondary">Class {s.class}{s.mobile ? ` · ${s.mobile}` : ''}</p>
                      </div>
                    </button>
                  ))}
                  {!searching && !results.length && query.trim().length >= 2 && (
                    <div className="px-3 py-2.5 text-sm text-text-secondary">No students found</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Paid months */}
        {student && (
          <div>
            <label className="label">Include paid months {selectedYear ? `(${selectedYear.label})` : ''}</label>
            {loadingFees ? (
              <div className="flex items-center gap-2 py-2 text-sm text-text-secondary"><Loader2 size={14} className="animate-spin" /> Loading fees…</div>
            ) : paidMonths.length === 0 ? (
              <p className="rounded-lg border border-border bg-slate-50 px-3 py-2.5 text-xs text-text-secondary">
                No paid months for this student in the selected year. Add free-form line items below instead.
              </p>
            ) : (
              <div className="space-y-1.5">
                {paidMonths.map((f) => {
                  const sel = months[f.month];
                  return (
                    <div key={f.month} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${sel ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                      <input type="checkbox" checked={!!sel} onChange={() => toggleMonth(f)} className="h-4 w-4 accent-[#0B1F4B]" />
                      <span className="flex-1 text-sm font-medium text-text-primary">{MONTH_LABELS[f.month] || f.month}</span>
                      <span className="text-xs text-text-secondary">paid {formatCurrency(f.paidAmount)}</span>
                      {sel && (
                        <input
                          type="number"
                          className="input h-9 w-28"
                          value={sel.amount}
                          min="0"
                          onChange={(e) => setMonthAmount(f.month, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Custom line items */}
        {student && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label mb-0">Custom line items</label>
              <button className="btn btn-ghost btn-sm" onClick={addCustom}><Plus size={14} /> Add line</button>
            </div>
            {customItems.length === 0 ? (
              <p className="text-xs text-text-secondary">Optional — add charges that aren’t tied to a month.</p>
            ) : (
              <div className="space-y-2">
                {customItems.map((it, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="input flex-1"
                      placeholder="Description (e.g. Late fee)"
                      value={it.description}
                      onChange={(e) => setCustom(i, 'description', e.target.value)}
                    />
                    <input
                      type="number"
                      className="input w-32"
                      placeholder="Amount"
                      min="0"
                      value={it.amount}
                      onChange={(e) => setCustom(i, 'amount', e.target.value)}
                    />
                    <button className="btn btn-ghost btn-sm px-2 text-danger" onClick={() => removeCustom(i)}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payment meta */}
        {student && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Payment Mode</label>
              <select className="input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={paymentDate} max={todayStr()} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Collected By</label>
              <input className="input" placeholder="Staff name" value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <label className="label">Note (optional)</label>
              <input className="input" placeholder="Shown on the receipt footer" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
