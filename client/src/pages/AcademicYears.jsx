import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { CalendarRange, CheckCircle2, Archive as ArchiveIcon, GraduationCap, ArrowRight, AlertTriangle, Loader2, Pencil, Trash2, ShieldCheck, Eye, EyeOff, FolderArchive, ArrowLeft, Users, IndianRupee } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import FilterBar from '../components/FilterBar.jsx';
import StatCard from '../components/StatCard.jsx';
import { SkeletonCards } from '../components/Skeleton.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { yearApi, authApi, archiveApi } from '../api/endpoints.js';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { formatDate, formatCurrency } from '../utils/format.js';
import { PROMOTION_MAP, CLASSES } from '../utils/constants.js';

export default function AcademicYears() {
  const { reloadAll } = useData();
  const { toast } = useUI();
  const location = useLocation();
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  // Default to 'archive' tab if redirected from /app/archive
  const [tab, setTab] = useState(() =>
    new URLSearchParams(location.search).get('tab') === 'archive' ? 'Archive' : 'Academic Years'
  );
  const [passwordGate, setPasswordGate] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setYears(await yearApi.list()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const refresh = async () => { await load(); reloadAll(); };

  // Called after password is verified — proceed with the intended action
  const afterPasswordVerified = (intent, year) => {
    if (intent === 'edit') setEditing(year);
    if (intent === 'delete') setConfirm({ action: 'delete', year });
    if (intent === 'promote') setPromoteOpen(true);
  };

  const doConfirm = async () => {
    const { action, year } = confirm;
    if (action === 'current') { await yearApi.setCurrent(year._id); toast.success(`${year.label} is now current`); }
    if (action === 'archive') { await yearApi.archive(year._id); toast.success(`${year.label} archived`); }
    if (action === 'delete') {
      const res = await yearApi.delete(year._id);
      const msg = res?.restoredCurrentYear
        ? `${year.label} deleted. "${res.restoredCurrentYear.label}" is now the current year.`
        : `${year.label} deleted.`;
      toast.success(msg, 6000);
    }
    await refresh();
  };

  const columns = [
    { key: 'label', header: 'Academic Year', render: (y) => <span className="font-heading font-bold text-text-primary">{y.label}</span> },
    { key: 'start', header: 'Start', render: (y) => formatDate(y.startDate) },
    { key: 'end', header: 'End', render: (y) => formatDate(y.endDate) },
    { key: 'count', header: 'Students', align: 'center', render: (y) => y.studentsCount ?? 0 },
    { key: 'status', header: 'Status', align: 'center', render: (y) => (
      y.isCurrent ? <span className="badge badge-active">Current</span>
        : y.isArchived ? <span className="badge badge-inactive">Archived</span>
        : <span className="badge badge-partial">Inactive</span>
    ) },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (y) => {
        const isInactive = !y.isCurrent && !y.isArchived;
        return (
          <div className="flex items-center justify-end gap-1">
            {isInactive && (
              <button className="btn btn-ghost btn-sm text-success" onClick={() => setConfirm({ action: 'current', year: y })} title="Set current">
                <CheckCircle2 size={15} /> Set Current
              </button>
            )}
            {isInactive && (
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirm({ action: 'archive', year: y })} title="Archive">
                <ArchiveIcon size={15} />
              </button>
            )}
            {/* Edit — inactive years only, password-gated */}
            {isInactive && (
              <button
                className="btn btn-ghost btn-sm px-2 text-primary"
                onClick={() => setPasswordGate({ intent: 'edit', year: y })}
                title="Edit year (password required)"
              >
                <Pencil size={15} />
              </button>
            )}
            {/* Delete — ALL years (including current), password-gated */}
            <button
              className="btn btn-ghost btn-sm px-2 text-danger"
              onClick={() => setPasswordGate({ intent: 'delete', year: y })}
              title="Delete year (password required)"
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      },
    },
  ];

  const currentYear = years.find((y) => y.isCurrent);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Academic Years"
        subtitle="Manage years, promotions and archived records"
        icon={CalendarRange}
      />

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-border">
        {['Academic Years', 'Archive'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition ${
              tab === t ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'Academic Years' ? <CalendarRange size={15} /> : <ArchiveIcon size={15} />}
            {t}
            {tab === t && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-accent" />}
          </button>
        ))}
      </div>

      {/* ── Academic Years tab ── */}
      {tab === 'Academic Years' && (
        <div className="space-y-6">
          <DataTable columns={columns} data={years} loading={loading} />

          {/* Promotion section */}
          <div className="card border-l-4 border-l-accent p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent"><GraduationCap size={22} /></span>
              <div className="flex-1">
                <h3 className="font-heading text-lg font-bold text-text-primary">Student Promotion</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Promote every active student to the next class and start a fresh academic year. The current year
                  ({currentYear?.label || '—'}) will be archived. This is a major operation — review the mapping below.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(PROMOTION_MAP).map(([from, to]) => (
                    <span key={from} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-slate-50 px-2.5 py-1 text-xs">
                      <b className="text-text-primary">{from}</b> <ArrowRight size={11} className="text-accent" /> <span className="text-text-secondary">{to}</span>
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-lg bg-warning/10 p-2.5 text-xs text-warning">
                  <AlertTriangle size={15} /> Class 10 students become Alumni. Run this only at year-end.
                </div>

                <button className="btn btn-primary btn-md mt-4" onClick={() => setPasswordGate({ intent: 'promote', year: currentYear })}>
                  <GraduationCap size={16} /> Run Promotion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Archive tab ── */}
      {tab === 'Archive' && <ArchiveTab />}

      <EditYearModal open={!!editing} year={editing} onClose={() => setEditing(null)} onSaved={refresh} />
      <PasswordGateModal
        open={!!passwordGate}
        intent={passwordGate?.intent}
        year={passwordGate?.year}
        onClose={() => setPasswordGate(null)}
        onVerified={(intent, year) => { setPasswordGate(null); afterPasswordVerified(intent, year); }}
      />
      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doConfirm}
        danger={confirm?.action === 'delete'}
        title={
          confirm?.action === 'current' ? 'Set as current year?' :
          confirm?.action === 'archive' ? 'Archive this year?' :
          'Delete this year?'
        }
        message={
          confirm?.action === 'current' ? `Make ${confirm?.year?.label} the active academic year?` :
          confirm?.action === 'archive' ? `Archive ${confirm?.year?.label}? Its records stay accessible in the Archive tab.` :
          confirm?.year?.isCurrent
            ? `⚠️ "${confirm?.year?.label}" is the CURRENT year. Deleting it will permanently remove all its students, fees, and receipts. This cannot be undone.`
            : `Permanently delete "${confirm?.year?.label}"? All students, fees, and receipts for this year will be erased. This cannot be undone.`
        }
        confirmLabel={
          confirm?.action === 'current' ? 'Set Current' :
          confirm?.action === 'archive' ? 'Archive' :
          'Delete Forever'
        }
      />
      <PromoteModal open={promoteOpen} currentYear={currentYear} years={years} onClose={() => setPromoteOpen(false)} onDone={refresh} />
    </div>
  );
}

function AddYearModal() { return null; } // kept as stub — year creation now happens inside PromoteModal

function EditYearModal({ open, year, onClose, onSaved }) {
  const { toast } = useUI();
  const [form, setForm] = useState({ label: '', startDate: '', endDate: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && year) {
      setForm({
        label: year.label || '',
        startDate: year.startDate ? new Date(year.startDate).toISOString().slice(0, 10) : '',
        endDate: year.endDate ? new Date(year.endDate).toISOString().slice(0, 10) : '',
      });
      setErrors({});
    }
  }, [open, year]);

  const submit = async () => {
    const e = {};
    if (!/^\d{4}-\d{4}$/.test(form.label)) e.label = 'Format: 2026-2027';
    if (!form.startDate) e.startDate = 'Required';
    if (!form.endDate) e.endDate = 'Required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await yearApi.update(year._id, form);
      toast.success('Academic year updated');
      onSaved();
      onClose();
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      toast.error(err.normalizedMessage || 'Update failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} title="Edit Academic Year" size="sm"
      footer={
        <>
          <button className="btn btn-outline btn-md" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-secondary btn-md" onClick={submit} disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />} Save Changes
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Label *</label>
          <input className={`input ${errors.label ? 'input-error' : ''}`} value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="2026-2027" />
          {errors.label && <p className="field-error">{errors.label}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start Date *</label>
            <input type="date" className={`input ${errors.startDate ? 'input-error' : ''}`} value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            {errors.startDate && <p className="field-error">{errors.startDate}</p>}
          </div>
          <div>
            <label className="label">End Date *</label>
            <input type="date" className={`input ${errors.endDate ? 'input-error' : ''}`} value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            {errors.endDate && <p className="field-error">{errors.endDate}</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PasswordGateModal({ open, intent, year, onClose, onVerified }) {
  const { toast } = useUI();
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setPassword(''); setError(''); setShowPw(false); }
  }, [open]);

  const verify = async () => {
    if (!password) { setError('Password is required'); return; }
    setVerifying(true);
    setError('');
    try {
      await authApi.verifyPassword(password);
      onVerified(intent, year);
    } catch (e) {
      setError(e.normalizedMessage || 'Incorrect password');
    } finally {
      setVerifying(false);
    }
  };

  const isDelete = intent === 'delete';
  const isPromote = intent === 'promote';

  return (
    <Modal
      open={open}
      onClose={verifying ? undefined : onClose}
      title="Admin Password Required"
      size="sm"
      footer={
        <>
          <button className="btn btn-outline btn-md" onClick={onClose} disabled={verifying}>Cancel</button>
          <button
            className={`btn btn-md ${isDelete ? 'btn-danger' : 'btn-primary'}`}
            onClick={verify}
            disabled={verifying}
          >
            {verifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {isDelete ? 'Verify & Delete' : isPromote ? 'Verify & Promote' : 'Verify & Edit'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className={`flex items-start gap-3 rounded-xl p-3.5 text-sm ${isDelete ? 'border border-danger/30 bg-danger/5 text-danger' : isPromote ? 'border border-warning/30 bg-warning/5 text-warning' : 'border border-primary/20 bg-primary/5 text-primary'}`}>
          <ShieldCheck size={17} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">
              {isDelete
                ? `You are about to delete "${year?.label}"`
                : isPromote
                ? 'You are about to run Student Promotion'
                : `You are about to edit "${year?.label}"`}
            </p>
            <p className="mt-0.5 text-xs opacity-80">
              {isDelete
                ? year?.isCurrent
                  ? 'This is the CURRENT year. Deleting will erase all students, fees, and receipts for it permanently.'
                  : 'This is a permanent action. All students, fees, and receipts for this year will be erased.'
                : isPromote
                ? 'Promotion clones all active students into the next academic year. This cannot be undone. Enter your password to proceed.'
                : 'Editing year data affects all related records. Enter your password to proceed.'}
            </p>
          </div>
        </div>

        <div>
          <label className="label">Your Admin Password <span className="text-danger">*</span></label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className={`input pr-10 ${error ? 'input-error' : ''}`}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter your password"
              onKeyDown={(e) => e.key === 'Enter' && verify()}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {error && <p className="field-error mt-1">{error}</p>}
        </div>
      </div>
    </Modal>
  );
}

function PromoteModal({ open, currentYear, years, onClose, onDone }) {
  const { toast } = useUI();
  const [step, setStep] = useState('setup');   // 'setup' | 'confirm' | 'done'
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedFromId, setSelectedFromId] = useState('');
  const [newYear, setNewYear] = useState({ label: '', startDate: '', endDate: '' });
  const [yearErrors, setYearErrors] = useState({});

  const nonArchivedYears = years.filter((y) => !y.isArchived);
  // When picking a source year manually, show all years (including archived) sorted newest first
  const allYearsSorted = [...years].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  const fromYear = currentYear || years.find((y) => y._id === selectedFromId);

  useEffect(() => {
    if (!open) return;
    setStep('setup');
    setResult(null);
    setYearErrors({});
    setSelectedFromId(currentYear?._id || '');
    if (currentYear?.label) {
      const [a, b] = currentYear.label.split('-').map(Number);
      if (!isNaN(a) && !isNaN(b)) {
        setNewYear({ label: `${a + 1}-${b + 1}`, startDate: `${a + 1}-06-01`, endDate: `${a + 2}-04-30` });
        return;
      }
    }
    setNewYear({ label: '', startDate: '', endDate: '' });
  }, [open, currentYear]);

  const set = (k, v) => { setNewYear((f) => ({ ...f, [k]: v })); setYearErrors((e) => ({ ...e, [k]: undefined })); };

  const handleFromSelect = (id) => {
    setSelectedFromId(id);
    const picked = years.find((y) => y._id === id);
    if (picked?.label) {
      const [a, b] = picked.label.split('-').map(Number);
      if (!isNaN(a) && !isNaN(b)) {
        setNewYear({ label: `${a + 1}-${b + 1}`, startDate: `${a + 1}-06-01`, endDate: `${a + 2}-04-30` });
        setYearErrors({});
      }
    }
  };

  const validateNewYear = () => {
    const e = {};
    if (!/^\d{4}-\d{4}$/.test(newYear.label)) e.label = 'Format: 2026-2027';
    if (!newYear.startDate) e.startDate = 'Required';
    if (!newYear.endDate) e.endDate = 'Required';
    setYearErrors(e);
    return Object.keys(e).length === 0;
  };

  const goToConfirm = () => {
    if (!fromYear) return toast.error('Select the year to promote students from');
    if (!validateNewYear()) return;
    setStep('confirm');
  };

  const run = async () => {
    setRunning(true);
    try {
      const created = await yearApi.create(newYear);
      const summary = await yearApi.promote({ fromYearId: fromYear._id, toYearId: created._id });
      setResult(summary);
      toast.success(`Promoted ${summary.promotedCount} students to ${summary.newYearLabel}`);
      onDone();
      setStep('done');
    } catch (e) {
      toast.error(e.normalizedMessage || 'Promotion failed');
      setStep('confirm');
    } finally { setRunning(false); }
  };

  return (
    <Modal
      open={open}
      onClose={running ? undefined : onClose}
      title="Run Student Promotion"
      size="md"
      footer={
        step === 'done'
          ? <button className="btn btn-primary btn-md" onClick={onClose}>Done</button>
          : step === 'confirm'
          ? <>
              <button className="btn btn-outline btn-md" onClick={() => setStep('setup')} disabled={running}>Back</button>
              <button className="btn btn-primary btn-md" onClick={run} disabled={running}>
                {running && <Loader2 size={16} className="animate-spin" />} Confirm &amp; Promote
              </button>
            </>
          : <>
              <button className="btn btn-outline btn-md" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary btn-md" onClick={goToConfirm} disabled={!fromYear}>
                Next — Review &amp; Confirm
              </button>
            </>
      }
    >
      {step === 'done' && result && (
        <div className="space-y-3 text-center py-2">
          <CheckCircle2 className="mx-auto text-success" size={44} />
          <h3 className="font-heading text-lg font-bold">Promotion complete!</h3>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Promoted" value={result.promotedCount} />
            <Stat label="Alumni" value={result.alumniCount} />
            <Stat label="New Year" value={result.newYearLabel} />
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="flex items-start gap-3 rounded-xl bg-danger/5 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div className="text-sm">
            <p className="font-semibold text-text-primary">
              Promote all active students from <span className="text-primary">{fromYear?.label}</span> → <span className="text-primary">{newYear.label}</span>
            </p>
            <p className="mt-1 text-text-secondary">
              A new year <b>{newYear.label}</b> ({newYear.startDate} → {newYear.endDate}) will be created with fresh fee records.
              <b className="text-warning"> {fromYear?.label} will be archived.</b> This cannot be undone.
            </p>
          </div>
        </div>
      )}

      {step === 'setup' && (
        <div className="space-y-5">
          {!currentYear && (
            <div className="rounded-xl border border-warning/40 bg-warning/5 p-3.5">
              <p className="mb-2 text-sm font-semibold text-warning">No current year is set</p>
              <p className="mb-3 text-xs text-text-secondary">Select the year to promote students FROM:</p>
              {allYearsSorted.length === 0 ? (
                <p className="text-xs text-text-secondary italic">No academic years found. Create one first.</p>
              ) : (
                <select className="input" value={selectedFromId} onChange={(e) => handleFromSelect(e.target.value)}>
                  <option value="">— Select source year —</option>
                  {allYearsSorted.map((y) => (
                    <option key={y._id} value={y._id}>
                      {y.label} · {y.studentsCount ?? 0} students{y.isArchived ? ' (archived)' : y.isCurrent ? ' (current)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {currentYear && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Promoting from</p>
              <p className="mt-0.5 font-bold text-primary">{currentYear.label}</p>
              <p className="text-xs text-text-secondary">{currentYear.studentsCount ?? 0} active students</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">New Academic Year Details</p>
            <div>
              <label className="label">Year Label <span className="text-danger">*</span></label>
              <input className={`input ${yearErrors.label ? 'input-error' : ''}`} value={newYear.label} onChange={(e) => set('label', e.target.value)} placeholder="e.g. 2026-2027" />
              {yearErrors.label && <p className="field-error">{yearErrors.label}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Date <span className="text-danger">*</span></label>
                <input type="date" className={`input ${yearErrors.startDate ? 'input-error' : ''}`} value={newYear.startDate} onChange={(e) => set('startDate', e.target.value)} />
                {yearErrors.startDate && <p className="field-error">{yearErrors.startDate}</p>}
              </div>
              <div>
                <label className="label">End Date <span className="text-danger">*</span></label>
                <input type="date" className={`input ${yearErrors.endDate ? 'input-error' : ''}`} value={newYear.endDate} onChange={(e) => set('endDate', e.target.value)} />
                {yearErrors.endDate && <p className="field-error">{yearErrors.endDate}</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-2.5 text-xs text-warning">
            <AlertTriangle size={15} /> Class 10 students become Alumni. Run this only at year-end.
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="font-heading text-lg font-bold text-primary">{value}</p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}

/* ─── Archive Tab ─────────────────────────────────────────────────────── */
function ArchiveTab() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    archiveApi.years().then((d) => setYears(d || [])).finally(() => setLoading(false));
  }, []);

  if (selected) return <ArchiveDetail year={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      {loading ? (
        <SkeletonCards count={3} />
      ) : years.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {years.map((y) => (
            <button key={y._id} onClick={() => setSelected(y)} className="card card-hover p-5 text-left animate-fade-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FolderArchive size={22} />
                </div>
                <span className="badge badge-inactive">Archived</span>
              </div>
              <h3 className="mt-4 font-heading text-xl font-bold text-text-primary">{y.label}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-xs text-text-secondary">Students</p><p className="font-bold">{y.studentsCount}</p></div>
                <div><p className="text-xs text-text-secondary">Collected</p><p className="font-bold text-success">{formatCurrency(y.totalCollected)}</p></div>
              </div>
              <p className="mt-4 text-sm font-semibold text-accent">View Records →</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={ArchiveIcon} title="No archived years" message="Years appear here after promotion archives them." />
        </div>
      )}
    </div>
  );
}

function ArchiveDetail({ year, onBack }) {
  const [search, setSearch] = useState('');
  const [cls, setCls] = useState('');
  const [page, setPage] = useState(1);
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => ({ page, limit: 20, search: search || undefined, class: cls || undefined }), [page, search, cls]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await archiveApi.year(year._id, params);
      setStudents(res.data?.students || []);
      setMeta(res.meta || null);
    } finally { setLoading(false); }
  }, [year._id, params]);

  useEffect(() => { load(); }, [load]);

  const resetPage = (fn) => (v) => { fn(v); setPage(1); };

  const columns = [
    { key: 'name',       header: 'Name',         render: (s) => <span className="font-medium text-text-primary">{s.name}</span> },
    { key: 'fatherName', header: 'Father',        render: (s) => <span className="text-text-secondary">{s.fatherName}</span> },
    { key: 'class',      header: 'Class',         render: (s) => `${s.class}` },
    { key: 'route',      header: 'Route',         render: (s) => s.routeId?.routeName || '—' },
    { key: 'mobile',     header: 'Mobile',        render: (s) => <span className="text-text-secondary">{s.mobile}</span> },
    { key: 'fee',        header: 'Monthly Fee', align: 'right', render: (s) => <span className="font-mono">{formatCurrency(s.monthlyFee)}</span> },
  ];

  return (
    <div>
      <button onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-primary">
        <ArrowLeft size={16} /> Back to archive
      </button>

      <div className="mb-5 flex items-center gap-3">
        <FolderArchive size={22} className="text-primary" />
        <div>
          <h2 className="font-heading text-xl font-bold text-text-primary">Archive — {year.label}</h2>
          <p className="text-sm text-text-secondary">Read-only historical records</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={Users} label="Total Students" value={year.studentsCount} variant="navy" />
        <StatCard icon={IndianRupee} label="Total Collected" value={year.totalCollected} currency variant="green" />
        <StatCard icon={IndianRupee} label="Total Pending" value={year.totalPending} currency variant="red" />
      </div>

      <FilterBar
        search={search}
        onSearch={resetPage(setSearch)}
        searchPlaceholder="Search archived students…"
        filters={[{ key: 'class', value: cls, onChange: resetPage(setCls), placeholder: 'All Classes', options: CLASSES.map((c) => ({ value: c, label: c })) }]}
      />

      <DataTable
        columns={columns}
        data={students}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        empty={<EmptyState icon={ArchiveIcon} title="No records" message="No students match this filter in the archive." />}
      />
    </div>
  );
}
