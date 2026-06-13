import { useState, useEffect, useCallback } from 'react';
import { UserCog, Plus, Pencil, Trash2, KeyRound, Loader2, ShieldCheck, Camera } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Avatar from '../components/Avatar.jsx';
import { userApi } from '../api/endpoints.js';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { formatDate } from '../utils/format.js';
import { uploadPhoto } from '../utils/cloudinary.js';

const readPhoto = null; // removed — photos now upload directly to Cloudinary

export default function SubAdmins() {
  const { routes } = useData();
  const { toast } = useUI();
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSubs(await userApi.listSubAdmins()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    await userApi.removeSubAdmin(toDelete._id);
    toast.success('Sub-admin removed');
    load();
  };

  const columns = [
    { key: 'name', header: 'Name', render: (u) => <div className="flex items-center gap-2.5"><Avatar src={u.photo} name={u.name} size="sm" /><span className="font-medium text-text-primary">{u.name}</span></div> },
    { key: 'username', header: 'Username', render: (u) => <span className="font-mono text-text-secondary">@{u.username}</span> },
    { key: 'mobile', header: 'Mobile', render: (u) => u.mobile },
    { key: 'route', header: 'Assigned Route', render: (u) => u.assignedRouteId?.routeName || '—' },
    { key: 'created', header: 'Created', render: (u) => <span className="text-text-secondary">{formatDate(u.createdAt)}</span> },
    { key: 'status', header: 'Status', align: 'center', render: (u) => <Badge variant={u.isActive ? 'active' : 'inactive'} /> },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          <button className="btn btn-ghost btn-sm px-2" onClick={() => setEditing(u)} title="Edit"><Pencil size={15} /></button>
          <button className="btn btn-ghost btn-sm px-2 text-primary" onClick={() => setResetting(u)} title="Reset password"><KeyRound size={15} /></button>
          <button className="btn btn-ghost btn-sm px-2 text-danger" onClick={() => setToDelete(u)} title="Delete"><Trash2 size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sub Admins"
        subtitle="Route managers with scoped access"
        icon={UserCog}
        actions={<button className="btn btn-secondary btn-md" onClick={() => setCreating(true)}><Plus size={16} /> Add Sub Admin</button>}
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-sm text-blue-800">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" />
        <p>Sub-admins can only access their assigned route's students and fees. They cannot view other routes, reports, buses, or settings.</p>
      </div>

      <DataTable
        columns={columns}
        data={subs}
        loading={loading}
        empty={<EmptyState icon={UserCog} title="No sub-admins yet" message="Create route managers to delegate fee collection." action={<button className="btn btn-primary btn-md" onClick={() => setCreating(true)}><Plus size={16} /> Add Sub Admin</button>} />}
      />

      <CreateSubAdminModal open={creating} routes={routes} onClose={() => setCreating(false)} onSaved={load} />
      <EditSubAdminModal open={!!editing} sub={editing} routes={routes} onClose={() => setEditing(null)} onSaved={load} />
      <ResetPasswordModal open={!!resetting} sub={resetting} onClose={() => setResetting(null)} />
      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete} title="Remove sub-admin?" message={`Remove ${toDelete?.name}'s access? This cannot be undone.`} confirmLabel="Remove" />
    </div>
  );
}

function CreateSubAdminModal({ open, routes, onClose, onSaved }) {
  const { toast } = useUI();
  const EMPTY = { name: '', mobile: '', username: '', password: '', confirmPassword: '', assignedRouteId: '', photo: '' };
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setForm(EMPTY); setErrors({}); } }, [open]);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadPhoto(file, toast);
    if (url) set('photo', url);
  };

  const submit = async () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!/^[0-9]{10}$/.test(form.mobile)) e.mobile = '10-digit number';
    if (form.username.trim().length < 3) e.username = 'Min 3 characters';
    if (form.password.length < 6) e.password = 'Min 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.assignedRouteId) e.assignedRouteId = 'Select a route';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await userApi.createSubAdmin(form);
      toast.success('Sub-admin created');
      onSaved(); onClose();
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      toast.error(err.normalizedMessage || 'Failed to create');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} title="Add Sub Admin" size="md"
      footer={<>
        <button className="btn btn-outline btn-md" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-secondary btn-md" onClick={submit} disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} Create Sub Admin</button>
      </>}
    >
      <div className="space-y-4">
        {/* Photo upload */}
        <div className="flex items-center gap-4">
          <label className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-border bg-slate-50 hover:border-accent transition">
            {form.photo
              ? <img src={form.photo} alt="" className="h-full w-full object-cover" />
              : <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400"><Camera size={20} /><span className="text-[10px]">Photo</span></span>}
            <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
          </label>
          <div className="text-xs text-text-secondary">
            <p className="font-semibold text-text-primary">Profile Photo</p>
            <p>Optional · JPG, PNG · max 2 MB</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" required error={errors.name}><input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Mobile" required error={errors.mobile}><input className={`input ${errors.mobile ? 'input-error' : ''}`} value={form.mobile} maxLength={10} onChange={(e) => set('mobile', e.target.value)} /></Field>
          <Field label="Username" required error={errors.username}><input className={`input ${errors.username ? 'input-error' : ''}`} value={form.username} onChange={(e) => set('username', e.target.value)} /></Field>
          <Field label="Assigned Route" required error={errors.assignedRouteId}>
            <select className={`input ${errors.assignedRouteId ? 'input-error' : ''}`} value={form.assignedRouteId} onChange={(e) => set('assignedRouteId', e.target.value)}>
              <option value="">Select route</option>
              {routes.map((r) => <option key={r._id} value={r._id}>{r.routeName}</option>)}
            </select>
          </Field>
          <Field label="Password" required error={errors.password}><input type="password" className={`input ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={(e) => set('password', e.target.value)} /></Field>
          <Field label="Confirm Password" required error={errors.confirmPassword}><input type="password" className={`input ${errors.confirmPassword ? 'input-error' : ''}`} value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function EditSubAdminModal({ open, sub, routes, onClose, onSaved }) {
  const { toast } = useUI();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && sub) setForm({ name: sub.name, mobile: sub.mobile, assignedRouteId: sub.assignedRouteId?._id || sub.assignedRouteId || '', isActive: sub.isActive, photo: sub.photo || '' });
  }, [open, sub]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadPhoto(file, toast);
    if (url) set('photo', url);
  };

  const save = async () => {
    setSaving(true);
    try {
      await userApi.updateSubAdmin(sub._id, form);
      toast.success('Sub-admin updated');
      onSaved(); onClose();
    } catch (e) { toast.error(e.normalizedMessage || 'Update failed'); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} title="Edit Sub Admin" size="md"
      footer={<><button className="btn btn-outline btn-md" onClick={onClose} disabled={saving}>Cancel</button><button className="btn btn-secondary btn-md" onClick={save} disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} Save</button></>}
    >
      <div className="space-y-4">
        {/* Photo */}
        <div className="flex items-center gap-4">
          <label className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-border bg-slate-50 hover:border-accent transition">
            {form.photo
              ? <img src={form.photo} alt="" className="h-full w-full object-cover" />
              : <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400"><Camera size={20} /><span className="text-[10px]">{sub?.photo ? 'Change' : 'Photo'}</span></span>}
            <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
          </label>
          <div className="text-xs text-text-secondary">
            <p className="font-semibold text-text-primary">Profile Photo</p>
            <p>Click to {sub?.photo ? 'change' : 'upload'} · max 2 MB</p>
            {form.photo && <button type="button" className="mt-1 text-danger hover:underline" onClick={() => set('photo', '')}>Remove photo</button>}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name"><input className="input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Mobile"><input className="input" value={form.mobile || ''} maxLength={10} onChange={(e) => set('mobile', e.target.value)} /></Field>
          <Field label="Assigned Route">
            <select className="input" value={form.assignedRouteId || ''} onChange={(e) => set('assignedRouteId', e.target.value)}>
              {routes.map((r) => <option key={r._id} value={r._id}>{r.routeName}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={form.isActive ? 'active' : 'inactive'} onChange={(e) => set('isActive', e.target.value === 'active')}>
              <option value="active">Active</option>
              <option value="inactive">Disabled</option>
            </select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ open, sub, onClose }) {
  const { toast } = useUI();
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setPw(''); }, [open]);

  const submit = async () => {
    if (pw.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await userApi.resetPassword(sub._id, pw);
      toast.success('Password reset');
      onClose();
    } catch (e) { toast.error(e.normalizedMessage || 'Failed'); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} title={`Reset password — ${sub?.name || ''}`} size="sm"
      footer={<><button className="btn btn-outline btn-md" onClick={onClose} disabled={saving}>Cancel</button><button className="btn btn-primary btn-md" onClick={submit} disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} Reset</button></>}
    >
      <Field label="New Password"><input type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" /></Field>
    </Modal>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="label">{label} {required && <span className="text-danger">*</span>}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
