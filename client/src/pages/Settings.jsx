import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Building2, ReceiptText, MessageSquare, ShieldCheck, Save, Loader2, Upload, UserCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { settingsApi, userApi } from '../api/endpoints.js';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, timeAgo } from '../utils/format.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const TABS = [
  { key: 'profile', label: 'Profile', icon: UserCircle },
  { key: 'company', label: 'Company', icon: Building2 },
  { key: 'receipt', label: 'Receipt', icon: ReceiptText },
  { key: 'reminders', label: 'Reminders', icon: MessageSquare },
  { key: 'security', label: 'Security', icon: ShieldCheck },
];

export default function Settings() {
  const { toast } = useUI();
  const { user, refreshUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    settingsApi.get().then(setSettings).finally(() => setLoading(false));
  }, []);

  const save = async (section, values) => {
    setSaving(true);
    try {
      const updated = await settingsApi.update({ [section]: values });
      setSettings(updated);
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e.normalizedMessage || 'Save failed');
    } finally { setSaving(false); }
  };

  if (loading || !settings) return <LoadingSpinner label="Loading settings…" />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your organization" icon={SettingsIcon} />
      <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition ${tab === t.key ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
            <t.icon size={15} /> {t.label}
            {tab === t.key && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-accent" />}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab user={user} onRefresh={refreshUser} />}
      {tab === 'company' && <CompanyTab settings={settings} onSave={(v) => save('company', v)} saving={saving} />}
      {tab === 'receipt' && <ReceiptTab settings={settings} onSave={(v) => save('receipt', v)} saving={saving} />}
      {tab === 'reminders' && <RemindersTab settings={settings} onSave={(v) => save('reminders', v)} saving={saving} />}
      {tab === 'security' && <SecurityTab />}
    </div>
  );
}

function useForm(initial) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [JSON.stringify(initial)]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return [form, set, setForm];
}

function ProfileTab({ user, onRefresh }) {
  const { toast } = useUI();
  const [form, setForm] = useState({ name: user?.name || '', mobile: user?.mobile || '', username: user?.username || '', photo: user?.photo || '' });
  const [saving, setSaving] = useState(false);

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadToCloudinary(file, { folder: 'huzaifa-crm/profiles' }).catch((err) => { toast.error(err.message || 'Upload failed'); return null; });
    if (url) setForm((f) => ({ ...f, photo: url }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    if (form.mobile && !/^[0-9]{10}$/.test(form.mobile)) return toast.error('Mobile must be 10 digits');
    if (!form.username || form.username.length < 3) return toast.error('Username must be at least 3 characters');
    setSaving(true);
    try {
      await userApi.updateOwnProfile({ name: form.name, mobile: form.mobile, username: form.username, photo: form.photo });
      await onRefresh();
      toast.success('Profile updated successfully');
    } catch (e) {
      toast.error(e.normalizedMessage || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  return (
    <div className="card max-w-2xl p-6">
      <div className="mb-6 flex items-center gap-4">
        {/* Avatar with upload */}
        <label className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-border bg-slate-50 hover:border-accent transition group">
          {form.photo
            ? <img src={form.photo} alt="profile" className="h-full w-full object-cover" />
            : <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
                <Upload size={20} />
                <span className="text-[10px]">Photo</span>
              </div>
          }
          {/* hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
            <Upload size={18} className="text-white" />
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
        </label>
        <div>
          <h3 className="font-heading text-lg font-bold text-text-primary">{form.name || '—'}</h3>
          <span className="inline-block rounded-full bg-accent/15 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent">
            {user?.role === 'superadmin' ? 'Super Admin' : 'Route Manager'}
          </span>
          {form.photo && (
            <button type="button" className="mt-1 block text-xs text-danger hover:underline" onClick={() => setForm((f) => ({ ...f, photo: '' }))}>
              Remove photo
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name" className="sm:col-span-2">
          <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Enter your full name" />
        </Field>
        <Field label="Username">
          <input className="input" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="e.g. masudali" />
        </Field>
        <Field label="Mobile Number">
          <input className="input" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} placeholder="10-digit mobile" maxLength={10} />
        </Field>
      </div>
      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-text-secondary">
        To change your password, go to the <strong>Security</strong> tab.
      </p>
      <SaveBar saving={saving} onSave={handleSave} />
    </div>
  );
}

/** Upload a file to Cloudinary and call cb(url) on success. Shows toast on error. */
async function readFile(file, cb, toast) {
  try {
    const url = await uploadToCloudinary(file, { folder: 'huzaifa-crm/settings' });
    cb(url);
  } catch (e) {
    toast?.error(e.message || 'Image upload failed');
  }
}

function SaveBar({ saving, onSave }) {
  return (
    <div className="mt-5 flex justify-end">
      <button className="btn btn-secondary btn-md" onClick={onSave} disabled={saving}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
      </button>
    </div>
  );
}

function CompanyTab({ settings, onSave, saving }) {
  const { toast } = useUI();
  const [form, set] = useForm(settings.company);
  return (
    <div className="card max-w-3xl p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-slate-50">
            {form.logo ? <img src={form.logo} alt="logo" className="h-full w-full object-cover" /> : <Building2 className="text-slate-300" size={28} />}
          </div>
          <label className="btn btn-outline btn-sm cursor-pointer">
            <Upload size={14} /> Upload Logo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && readFile(e.target.files[0], (d) => set('logo', d), toast)} />
          </label>
        </div>
        <Field label="Company Name"><input className="input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Phone"><input className="input" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email"><input className="input" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Address" className="sm:col-span-2"><textarea className="input h-16 resize-none py-2" value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
      </div>
      <SaveBar saving={saving} onSave={() => onSave(form)} />
    </div>
  );
}

function ReceiptTab({ settings, onSave, saving }) {
  const { toast } = useUI();
  const [form, set] = useForm(settings.receipt);
  return (
    <div className="card max-w-3xl p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Receipt Prefix"><input className="input" value={form.prefix || ''} onChange={(e) => set('prefix', e.target.value)} placeholder="HT" /></Field>
        <Field label="Footer Text" className="sm:col-span-2"><input className="input" value={form.footerText || ''} onChange={(e) => set('footerText', e.target.value)} /></Field>
        <div className="sm:col-span-2">
          <label className="label">Digital Signature</label>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-40 items-center justify-center overflow-hidden rounded-xl border border-border bg-slate-50">
              {form.signature ? <img src={form.signature} alt="signature" className="h-full object-contain" /> : <span className="text-xs text-slate-400">No signature</span>}
            </div>
            <label className="btn btn-outline btn-sm cursor-pointer">
              <Upload size={14} /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && readFile(e.target.files[0], (d) => set('signature', d), toast)} />
            </label>
          </div>
        </div>
      </div>
      <SaveBar saving={saving} onSave={() => onSave(form)} />
    </div>
  );
}

function RemindersTab({ settings, onSave, saving }) {
  const [form, set] = useForm(settings.reminders);
  return (
    <div className="card max-w-3xl p-6">
      <div className="space-y-4">
        <Field label="WhatsApp Template"><textarea className="input h-24 resize-none py-2" value={form.whatsappTemplate || ''} onChange={(e) => set('whatsappTemplate', e.target.value)} /></Field>
        <Field label="SMS Template"><textarea className="input h-20 resize-none py-2" value={form.smsTemplate || ''} onChange={(e) => set('smsTemplate', e.target.value)} /></Field>
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-text-secondary">
          Available placeholders: <code className="font-mono text-primary">{'{studentName}'}</code>, <code className="font-mono text-primary">{'{month}'}</code>, <code className="font-mono text-primary">{'{remaining}'}</code>
        </p>
      </div>
      <SaveBar saving={saving} onSave={() => onSave(form)} />
    </div>
  );
}

function SecurityTab() {
  const { toast } = useUI();
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try { const res = await settingsApi.activityLogs({ limit: 20 }); setLogs(res.data || []); }
    finally { setLogsLoading(false); }
  }, []);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  const changePw = async () => {
    if (pw.newPassword.length < 6) return toast.error('New password must be at least 6 characters');
    if (pw.newPassword !== pw.confirm) return toast.error('Passwords do not match');
    setSaving(true);
    try {
      await userApi.changeOwnPassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success('Password updated');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      loadLogs();
    } catch (e) { toast.error(e.normalizedMessage || 'Failed to update password'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="card max-w-3xl p-6">
        <h3 className="mb-4 font-heading text-base font-bold text-text-primary">Change Password</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Current Password"><input type="password" className="input" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} /></Field>
          <Field label="New Password"><input type="password" className="input" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} /></Field>
          <Field label="Confirm Password"><input type="password" className="input" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} /></Field>
        </div>
        <SaveBar saving={saving} onSave={changePw} />
      </div>

      <div className="card p-6">
        <h3 className="mb-4 font-heading text-base font-bold text-text-primary">Activity Log</h3>
        {logsLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white"><tr className="border-b border-border text-left text-xs font-semibold uppercase text-text-secondary"><th className="py-2 pr-3">User</th><th className="py-2 pr-3">Action</th><th className="py-2 pr-3">Details</th><th className="py-2">Time</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">{l.userId?.name || '—'}</td>
                    <td className="py-2 pr-3"><code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-primary">{l.action}</code></td>
                    <td className="max-w-[280px] truncate py-2 pr-3 text-text-secondary">{JSON.stringify(l.details || {})}</td>
                    <td className="py-2 text-text-secondary" title={formatDate(l.timestamp)}>{timeAgo(l.timestamp)}</td>
                  </tr>
                ))}
                {!logs.length && <tr><td colSpan={4} className="py-6 text-center text-text-secondary">No activity yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
