import { useState, useEffect } from 'react';
import { Loader2, UserPlus, Trash2, Camera, Users, IndianRupee } from 'lucide-react';
import Modal from './Modal.jsx';
import { studentApi } from '../api/endpoints.js';
import { useUI } from '../context/UIContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { CLASSES, SECTIONS, GENDERS } from '../utils/constants.js';
import { formatCurrency } from '../utils/format.js';
import { uploadPhoto } from '../utils/cloudinary.js';

const EMPTY_SIBLING = {
  photo: '', name: '', gender: 'Male', dob: '',
  class: '', section: 'A', monthlyFee: '',
  academicYearId: '', admissionDate: '',
};

/**
 * SiblingsModal — manage embedded siblings on a single student record.
 * Siblings share the same route/bus/pickup/drop as the primary student.
 * Combined fee = baseFee (primary) + sum of all sibling fees.
 */
export default function SiblingsModal({ open, student, onClose, onSaved }) {
  const { toast } = useUI();
  const { years } = useData();
  const [siblings, setSiblings] = useState([]);
  const [baseFee, setBaseFee]   = useState(0);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (open && student) {
      setSiblings((student.siblings || []).map((s) => ({
        ...EMPTY_SIBLING,
        ...s,
        dob:           s.dob           ? new Date(s.dob).toISOString().slice(0, 10)           : '',
        admissionDate: s.admissionDate ? new Date(s.admissionDate).toISOString().slice(0, 10) : '',
        academicYearId: s.academicYearId?._id || s.academicYearId || '',
        monthlyFee:    s.monthlyFee ?? 0,
      })));
      setBaseFee(Number(student.baseFee) || Number(student.monthlyFee) || 0);
    }
  }, [open, student]);

  if (!student) return null;

  const add    = () => setSiblings((s) => [...s, {
    ...EMPTY_SIBLING,
    academicYearId: student.academicYearId?._id || student.academicYearId || '',
    admissionDate:  new Date().toISOString().slice(0, 10),
  }]);
  const remove = (i) => setSiblings((s) => s.filter((_, idx) => idx !== i));
  const update = (i, k, v) => setSiblings((s) => s.map((sib, idx) => idx === i ? { ...sib, [k]: v } : sib));

  const readPhoto = async (file, idx) => {
    if (!file) return;
    const url = await uploadPhoto(file, toast, 'huzaifa-crm/siblings');
    if (url) update(idx, 'photo', url);
  };

  const totalFee = Number(baseFee) + siblings.reduce((sum, s) => sum + (Number(s.monthlyFee) || 0), 0);

  const save = async () => {
    const invalid = siblings.find((s) => !s.name?.trim() || !s.class);
    if (invalid) return toast.error('Each sibling needs a name and class');
    setSaving(true);
    try {
      await studentApi.updateSiblings(student._id, {
        siblings: siblings.map((s) => ({
          ...s,
          monthlyFee:    Number(s.monthlyFee) || 0,
          dob:           s.dob           || undefined,
          admissionDate: s.admissionDate || undefined,
          academicYearId: s.academicYearId || undefined,
        })),
        baseFee: Number(baseFee),
      });
      toast.success(`Siblings saved — combined fee ${formatCurrency(totalFee)}`);
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error(e.normalizedMessage || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Manage Siblings"
      size="xl"
      footer={
        <>
          <button className="btn btn-outline btn-md" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-secondary btn-md" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
            Save Siblings
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Shared transport */}
        <div className="rounded-xl border border-border bg-slate-50 p-3 text-xs text-text-secondary">
          <p className="font-semibold uppercase tracking-wide text-text-primary">All siblings share these transport details</p>
          <p className="mt-1">
            Route: <b>{student.routeId?.routeName || '—'}</b> · Bus: <b>{student.busId?.busNumber || '—'}</b> ·
            Pickup: <b>{student.pickupPoint}</b> · Drop: <b>{student.dropPoint}</b>
          </p>
        </div>

        {/* Primary student fee */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div>
            <p className="text-xs font-semibold uppercase text-text-secondary">Primary student</p>
            <p className="font-semibold text-text-primary">{student.name}</p>
          </div>
          <div>
            <label className="label text-xs">Primary Monthly Fee (₹)</label>
            <input
              type="number" className="input" value={baseFee} min={0}
              onChange={(e) => setBaseFee(e.target.value)} placeholder="e.g. 1500"
            />
          </div>
        </div>

        {/* Sibling cards */}
        {siblings.map((s, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">Sibling {i + 1}</p>
              <button type="button" onClick={() => remove(i)} className="btn btn-ghost btn-sm px-2 text-danger">
                <Trash2 size={14} />
              </button>
            </div>

            {/* Photo + name row */}
            <div className="flex items-start gap-4">
              <label className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-border bg-slate-50 hover:border-accent">
                {s.photo
                  ? <img src={s.photo} alt="" className="h-full w-full object-cover" />
                  : <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
                      <Camera size={18} /><span className="text-[9px]">Photo</span>
                    </span>}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => readPhoto(e.target.files?.[0], i)} />
              </label>

              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">Full Name *</label>
                  <input
                    className={`input ${!s.name && saving ? 'input-error' : ''}`}
                    value={s.name} onChange={(e) => update(i, 'name', e.target.value)}
                    placeholder="Sibling's full name"
                  />
                </div>
                <div>
                  <label className="label">Monthly Fee (₹)</label>
                  <input
                    type="number" className="input" value={s.monthlyFee || ''} min={0}
                    onChange={(e) => update(i, 'monthlyFee', e.target.value)} placeholder="e.g. 1500"
                  />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select className="input" value={s.gender || 'Male'} onChange={(e) => update(i, 'gender', e.target.value)}>
                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Academic + dates row */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="label">Class *</label>
                <select
                  className={`input ${!s.class && saving ? 'input-error' : ''}`}
                  value={s.class} onChange={(e) => update(i, 'class', e.target.value)}
                >
                  <option value="">Select class</option>
                  {CLASSES.filter((c) => c !== 'Alumni').map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Section</label>
                <select className="input" value={s.section || 'A'} onChange={(e) => update(i, 'section', e.target.value)}>
                  {SECTIONS.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Academic Year</label>
                <select className="input" value={s.academicYearId || ''} onChange={(e) => update(i, 'academicYearId', e.target.value)}>
                  <option value="">Select year</option>
                  {years.map((y) => <option key={y._id} value={y._id}>{y.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input type="date" className="input" value={s.dob || ''} onChange={(e) => update(i, 'dob', e.target.value)} />
              </div>
              <div>
                <label className="label">Admission Date</label>
                <input type="date" className="input" value={s.admissionDate || ''} onChange={(e) => update(i, 'admissionDate', e.target.value)} />
              </div>
            </div>
          </div>
        ))}

        <button type="button" className="btn btn-outline btn-md w-full" onClick={add}>
          <UserPlus size={15} /> Add Sibling
        </button>

        {/* Combined fee summary */}
        <div className={`flex items-center justify-between rounded-xl p-3 text-sm font-semibold ${
          siblings.length > 0 ? 'bg-success/10 text-success' : 'bg-slate-50 text-text-secondary'
        }`}>
          <span className="flex items-center gap-2">
            <IndianRupee size={15} />
            Combined Fee ({1 + siblings.length} student{siblings.length > 0 ? 's' : ''})
          </span>
          <span className="font-heading text-lg">{formatCurrency(totalFee)}</span>
        </div>

        {siblings.length > 0 && (
          <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-text-secondary space-y-0.5">
            <p className="font-semibold text-text-primary">Fee breakdown</p>
            <p>{student.name} (primary): {formatCurrency(Number(baseFee) || 0)}</p>
            {siblings.map((s, i) => (
              <p key={i}>{s.name || `Sibling ${i + 1}`}: {formatCurrency(Number(s.monthlyFee) || 0)}</p>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
