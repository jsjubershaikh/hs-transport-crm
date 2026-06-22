import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Camera, Save, RotateCcw, Loader2, User, BookOpen, Bus, ArrowLeft } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { studentApi } from '../api/endpoints.js';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { CLASSES, GENDERS, SCHOOLS } from '../utils/constants.js';
import { uploadPhoto } from '../utils/cloudinary.js';

const EMPTY = {
  photo: '', name: '', fatherName: '', motherName: '', mobile: '', altMobile: '', address: '',
  gender: 'Male', dob: '', class: '', school: '', academicYearId: '',
  routeId: '', busId: '', pickupPoint: '', monthlyFee: '',
};

export default function AddStudent() {
  const navigate = useNavigate();
  const { routes, buses, years, currentYear } = useData();
  const { toast } = useUI();
  const { user } = useAuth();

  const subRoute = user?.role === 'subadmin' ? user.assignedRouteId : null;
  const [form, setForm] = useState({
    ...EMPTY,
    academicYearId: currentYear?._id || '',
    routeId: subRoute || '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const availableRoutes = subRoute ? routes.filter((r) => String(r._id) === String(subRoute)) : routes;
  const availableBuses = useMemo(
    () => (form.routeId ? buses.filter((b) => String(b.assignedRouteId?._id || b.assignedRouteId) === String(form.routeId)) : buses),
    [buses, form.routeId]
  );

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onRouteChange = (routeId) => {
    const route = routes.find((r) => String(r._id) === String(routeId));
    setForm((f) => ({
      ...f,
      routeId,
      busId: '',
      monthlyFee: f.monthlyFee || (route?.defaultMonthlyFee ? String(route.defaultMonthlyFee) : ''),
    }));
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadPhoto(file, toast);
    if (url) set('photo', url);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.fatherName.trim()) e.fatherName = 'Father name is required';
    if (!form.motherName.trim()) e.motherName = 'Mother name is required';
    if (!/^[0-9]{10}$/.test(form.mobile)) e.mobile = 'Enter a valid 10-digit mobile';
    if (form.altMobile && !/^[0-9]{10}$/.test(form.altMobile)) e.altMobile = 'Enter a valid 10-digit mobile';
    if (!form.class) e.class = 'Class is required';
    if (!form.school.trim()) e.school = 'School is required';
    if (!form.academicYearId) e.academicYearId = 'Academic year is required';
    if (!form.routeId) e.routeId = 'Route is required';
    if (!form.busId) e.busId = 'Bus is required';
    if (!form.pickupPoint.trim()) e.pickupPoint = 'Pickup & drop point is required';
    if (form.monthlyFee === '' || Number(form.monthlyFee) < 0) e.monthlyFee = 'Enter a valid fee';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      // Pickup & drop are the same location — keep the backend dropPoint in sync.
      const payload = {
        ...form,
        dropPoint: form.pickupPoint,
        monthlyFee: Number(form.monthlyFee),
        dob: form.dob || undefined,
      };
      const student = await studentApi.create(payload);
      toast.success(`${student.name} added successfully!`);
      navigate(`/app/students/${student._id}`);
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      toast.error(err.normalizedMessage || 'Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm({ ...EMPTY, academicYearId: currentYear?._id || '', routeId: subRoute || '' });
    setErrors({});
  };

  return (
    <div>
      <button
        onClick={() => navigate('/app/students')}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-primary"
      >
        <ArrowLeft size={16} /> Back to students
      </button>
      <PageHeader title="Add Student" subtitle="Create a new student record" icon={UserPlus} />

      <form onSubmit={onSubmit} className={`space-y-5 ${Object.keys(errors).length ? 'animate-shake' : ''}`} noValidate>
        {/* Section A — Personal */}
        <Section icon={User} title="Personal Details">
          <div className="flex flex-col gap-5 sm:flex-row">
            {/* Photo */}
            <div className="flex flex-col items-center">
              <label className="group relative h-28 w-28 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-border bg-slate-50 transition hover:border-accent">
                {form.photo ? (
                  <img src={form.photo} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
                    <Camera size={24} />
                    <span className="text-[11px]">Add Photo</span>
                  </span>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              </label>
            </div>

            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <Field label="Student Name" required error={errors.name}>
                <input className={inp(errors.name)} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
              </Field>
              <Field label="Father's Name" required error={errors.fatherName}>
                <input className={inp(errors.fatherName)} value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} />
              </Field>
              <Field label="Mother's Name" required error={errors.motherName}>
                <input className={inp(errors.motherName)} value={form.motherName} onChange={(e) => set('motherName', e.target.value)} />
              </Field>
              <Field label="Mobile" required error={errors.mobile}>
                <input className={inp(errors.mobile)} value={form.mobile} onChange={(e) => set('mobile', e.target.value)} maxLength={10} placeholder="10-digit number" />
              </Field>
              <Field label="Alternate Mobile" error={errors.altMobile}>
                <input className={inp(errors.altMobile)} value={form.altMobile} onChange={(e) => set('altMobile', e.target.value)} maxLength={10} />
              </Field>
              <Field label="Gender">
                <div className="flex gap-2">
                  {GENDERS.map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => set('gender', g)}
                      className={`flex-1 rounded-input border px-3 py-2 text-sm font-medium transition ${
                        form.gender === g ? 'border-primary bg-primary/5 text-primary' : 'border-border text-text-secondary hover:border-primary/40'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Date of Birth">
                <input type="date" className={inp()} value={form.dob} onChange={(e) => set('dob', e.target.value)} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <textarea className={`${inp()} h-20 resize-none py-2`} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Residential address" />
              </Field>
            </div>
          </div>
        </Section>

        {/* Section B — Academic */}
        <Section icon={BookOpen} title="Academic Details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Class" required error={errors.class}>
              <select className={inp(errors.class)} value={form.class} onChange={(e) => set('class', e.target.value)}>
                <option value="">Select class</option>
                {CLASSES.filter((c) => c !== 'Alumni').map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="School" required error={errors.school} className="lg:col-span-2">
              <select className={inp(errors.school)} value={form.school} onChange={(e) => set('school', e.target.value)}>
                <option value="">Select school</option>
                {SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Academic Year" required error={errors.academicYearId}>
              <select className={inp(errors.academicYearId)} value={form.academicYearId} onChange={(e) => set('academicYearId', e.target.value)}>
                <option value="">Select year</option>
                {years.map((y) => <option key={y._id} value={y._id}>{y.label}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        {/* Section C — Transport */}
        <Section icon={Bus} title="Transport Details">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Route" required error={errors.routeId}>
              <select className={inp(errors.routeId)} value={form.routeId} onChange={(e) => onRouteChange(e.target.value)} disabled={!!subRoute}>
                <option value="">Select route</option>
                {availableRoutes.map((r) => <option key={r._id} value={r._id}>{r.routeName} ({r.routeNumber})</option>)}
              </select>
            </Field>
            <Field label="Bus" required error={errors.busId}>
              <select className={inp(errors.busId)} value={form.busId} onChange={(e) => set('busId', e.target.value)} disabled={!form.routeId}>
                <option value="">{form.routeId ? 'Select bus' : 'Select route first'}</option>
                {availableBuses.map((b) => <option key={b._id} value={b._id}>{b.busNumber} — {b.vehicleNumber}</option>)}
              </select>
            </Field>
            <Field label="Monthly Fee (₹)" required error={errors.monthlyFee}>
              <input type="number" className={inp(errors.monthlyFee)} value={form.monthlyFee} onChange={(e) => set('monthlyFee', e.target.value)} placeholder="e.g. 1500" />
            </Field>
            <Field label="Pickup & Drop Point" required error={errors.pickupPoint}>
              <input className={inp(errors.pickupPoint)} value={form.pickupPoint} onChange={(e) => set('pickupPoint', e.target.value)} placeholder="Stop name" />
            </Field>
          </div>
        </Section>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-outline btn-md" onClick={reset} disabled={submitting}>
            <RotateCcw size={16} /> Reset Form
          </button>
          <button type="submit" className="btn btn-secondary btn-md" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Student
          </button>
        </div>
      </form>
    </div>
  );
}

const inp = (err) => `input ${err ? 'input-error' : ''}`;

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card p-5 sm:p-6 animate-fade-slide-up">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-primary"><Icon size={17} /></span>
        <h3 className="font-heading text-base font-bold text-text-primary">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, error, children, className = '' }) {
  return (
    <div className={className}>
      <label className="label">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
