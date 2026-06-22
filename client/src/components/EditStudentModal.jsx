import { useState, useEffect, useMemo } from 'react';
import { Loader2, Camera, Trash2, Users } from 'lucide-react';
import Modal from './Modal.jsx';
import Avatar from './Avatar.jsx';
import SiblingsModal from './SiblingsModal.jsx';
import { studentApi } from '../api/endpoints.js';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { CLASSES, GENDERS, SCHOOLS } from '../utils/constants.js';
import { uploadPhoto } from '../utils/cloudinary.js';

/** Edit a student's mutable fields including photo. Subadmins can't change the route. */
export default function EditStudentModal({ open, student, onClose, onSaved }) {
  const { routes, buses } = useData();
  const { toast } = useUI();
  const { isSuperAdmin } = useAuth();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [siblingsOpen, setSiblingsOpen] = useState(false);

  useEffect(() => {
    if (open && student) {
      setForm({
        photo: student.photo || '',
        name: student.name, fatherName: student.fatherName, motherName: student.motherName,
        mobile: student.mobile, altMobile: student.altMobile || '', address: student.address || '',
        gender: student.gender || '', dob: student.dob ? student.dob.slice(0, 10) : '',
        class: student.class, section: student.section, school: student.school,
        routeId: student.routeId?._id || student.routeId, busId: student.busId?._id || student.busId,
        pickupPoint: student.pickupPoint,
        monthlyFee: student.monthlyFee, status: student.status,
      });
    }
    // Initialize only when the modal OPENS — never while it's open — so a
    // background refresh (another admin's change) can't wipe unsaved edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const availableBuses = useMemo(
    () => buses.filter((b) => String(b.assignedRouteId?._id || b.assignedRouteId) === String(form.routeId)),
    [buses, form.routeId]
  );

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadPhoto(file, toast);
    if (url) set('photo', url);
  };

  const save = async () => {
    setSaving(true);
    try {
      // Pickup & drop are the same location — keep the backend dropPoint in sync.
      await studentApi.update(student._id, {
        ...form,
        dropPoint: form.pickupPoint,
        monthlyFee: Number(form.monthlyFee),
      });
      toast.success('Student updated');
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error(e.normalizedMessage || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
          open={open}
          onClose={saving ? undefined : onClose}
          title="Edit Student"
          size="lg"
      footer={
        <>
          <button className="btn btn-ghost btn-md mr-auto" onClick={() => setSiblingsOpen(true)} title="Manage siblings">
            <Users size={15} /> Siblings {student?.siblings?.length > 0 ? `(${student.siblings.length})` : ''}
          </button>
          <button className="btn btn-outline btn-md" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-secondary btn-md" onClick={save} disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />} Save Changes
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Photo upload */}
        <div className="flex items-center gap-5 rounded-xl border border-border bg-slate-50 p-4">
          <div className="relative shrink-0">
            {form.photo ? (
              <img src={form.photo} alt="student" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white shadow" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-200 text-slate-400 shadow">
                <Avatar name={form.name} size="lg" />
              </div>
            )}
            {/* Remove photo button */}
            {form.photo && (
              <button
                type="button"
                onClick={() => set('photo', '')}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white shadow hover:bg-red-700"
                title="Remove photo"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-text-primary">Student Photo</p>
            <label className="btn btn-outline btn-sm cursor-pointer">
              <Camera size={14} /> {form.photo ? 'Change Photo' : 'Upload Photo'}
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            </label>
            <p className="mt-1.5 text-xs text-text-secondary">JPG, PNG or WEBP · max 2 MB</p>
          </div>
        </div>

        {/* All other fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Name"><input className="input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></F>
          <F label="Father's Name"><input className="input" value={form.fatherName || ''} onChange={(e) => set('fatherName', e.target.value)} /></F>
          <F label="Mother's Name"><input className="input" value={form.motherName || ''} onChange={(e) => set('motherName', e.target.value)} /></F>
          <F label="Mobile"><input className="input" value={form.mobile || ''} maxLength={10} onChange={(e) => set('mobile', e.target.value)} /></F>
          <F label="Class">
            <select className="input" value={form.class || ''} onChange={(e) => set('class', e.target.value)}>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </F>
          <F label="Gender">
            <select className="input" value={form.gender || ''} onChange={(e) => set('gender', e.target.value)}>
              <option value="">Select gender</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </F>
          <F label="Date of Birth"><input type="date" className="input" value={form.dob || ''} onChange={(e) => set('dob', e.target.value)} /></F>
          <F label="School">
            <select className="input" value={form.school || ''} onChange={(e) => set('school', e.target.value)}>
              <option value="">Select school</option>
              {SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
              {form.school && !SCHOOLS.includes(form.school) && <option value={form.school}>{form.school}</option>}
            </select>
          </F>
          <F label="Status">
            <select className="input" value={form.status || 'active'} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </F>
          <F label="Route">
            <select className="input" value={form.routeId || ''} onChange={(e) => { set('routeId', e.target.value); set('busId', ''); }} disabled={!isSuperAdmin}>
              {routes.map((r) => <option key={r._id} value={r._id}>{r.routeName}</option>)}
            </select>
          </F>
          <F label="Bus">
            <select className="input" value={form.busId || ''} onChange={(e) => set('busId', e.target.value)}>
              <option value="">Select bus</option>
              {availableBuses.map((b) => <option key={b._id} value={b._id}>{b.busNumber}</option>)}
            </select>
          </F>
          <F label="Pickup & Drop Point"><input className="input" value={form.pickupPoint || ''} onChange={(e) => set('pickupPoint', e.target.value)} /></F>
          <F label="Monthly Fee"><input type="number" className="input" value={form.monthlyFee ?? ''} onChange={(e) => set('monthlyFee', e.target.value)} /></F>
          <F label="Alt Mobile"><input className="input" value={form.altMobile || ''} maxLength={10} onChange={(e) => set('altMobile', e.target.value)} /></F>
          <F label="Address" className="sm:col-span-2">
            <textarea className="input h-16 resize-none py-2" value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
          </F>
        </div>
      </div>
      </Modal>

      <SiblingsModal
        open={siblingsOpen}
        student={student}
        onClose={() => setSiblingsOpen(false)}
        onSaved={() => { setSiblingsOpen(false); onSaved?.(); }}
      />
    </>
  );
}

function F({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
