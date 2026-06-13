import { useState, useEffect } from 'react';
import { Route as RouteIcon, Plus, Loader2 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import RouteCard from '../components/RouteCard.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Badge from '../components/Badge.jsx';
import { SkeletonCards } from '../components/Skeleton.jsx';
import { useRoutes } from '../hooks/useRoutes.js';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { routeApi } from '../api/endpoints.js';
import { formatCurrency } from '../utils/format.js';

const EMPTY = { routeName: '', routeNumber: '', driverName: '', driverContact: '', busId: '', defaultMonthlyFee: '' };

export default function RoutesPage() {
  const { data: routes, loading, refetch } = useRoutes();
  const { buses, reloadAll } = useData();
  const { toast } = useUI();

  const [editing, setEditing] = useState(null); // route or {} for new
  const [toDelete, setToDelete] = useState(null);
  const [viewing, setViewing] = useState(null);

  const save = async (form) => {
    const body = { ...form, defaultMonthlyFee: Number(form.defaultMonthlyFee) || 0, busId: form.busId || null };
    if (editing?._id) await routeApi.update(editing._id, body);
    else await routeApi.create(body);
    toast.success(editing?._id ? 'Route updated' : 'Route created');
    refetch(); reloadAll();
    setEditing(null);
  };

  const handleDelete = async () => {
    try {
      await routeApi.remove(toDelete._id);
      toast.success('Route deleted');
      refetch(); reloadAll();
    } catch (e) {
      // 409 when the route still has students.
      toast.error(e.normalizedMessage || 'Cannot delete route');
    }
  };

  return (
    <div>
      <PageHeader
        title="Route Management"
        subtitle={`${routes.length} routes configured`}
        icon={RouteIcon}
        actions={<button className="btn btn-secondary btn-md" onClick={() => setEditing(EMPTY)}><Plus size={16} /> Add Route</button>}
      />

      {loading ? (
        <SkeletonCards count={4} />
      ) : routes.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {routes.map((r) => (
            <RouteCard key={r._id} route={r} onEdit={setEditing} onDelete={setToDelete} onView={setViewing} />
          ))}
        </div>
      ) : (
        <div className="card"><EmptyState icon={RouteIcon} title="No routes yet" message="Create your first route to assign students." action={<button className="btn btn-primary btn-md" onClick={() => setEditing(EMPTY)}><Plus size={16} /> Add Route</button>} /></div>
      )}

      <RouteFormModal open={!!editing} route={editing} buses={buses} onClose={() => setEditing(null)} onSave={save} />

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Delete route?"
        message={`Delete ${toDelete?.routeName}? Routes with students cannot be deleted until reassigned.`}
        confirmLabel="Delete"
      />

      <ViewStudentsModal open={!!viewing} route={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function RouteFormModal({ open, route, buses, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Initialize the form whenever a route is opened for add/edit.
  useEffect(() => {
    if (!open || !route) return;
    setForm({
      routeName: route.routeName || '', routeNumber: route.routeNumber || '',
      driverName: route.driverName || '', driverContact: route.driverContact || '',
      busId: route.busId?._id || route.busId || '', defaultMonthlyFee: route.defaultMonthlyFee ?? '',
    });
    setErrors({});
  }, [open, route]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const submit = async () => {
    const e = {};
    if (!form.routeName?.trim()) e.routeName = 'Required';
    if (!form.routeNumber?.trim()) e.routeNumber = 'Required';
    if (!form.driverName?.trim()) e.driverName = 'Required';
    if (!/^[0-9]{10}$/.test(form.driverContact || '')) e.driverContact = '10-digit number';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try { await onSave(form); } catch (err) { setErrors({ routeNumber: err.normalizedMessage }); } finally { setSaving(false); }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={route?._id ? 'Edit Route' : 'Add Route'}
      size="md"
      footer={<>
        <button className="btn btn-outline btn-md" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-secondary btn-md" onClick={submit} disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} Save</button>
      </>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Route Name" required error={errors.routeName}><input className={`input ${errors.routeName ? 'input-error' : ''}`} value={form.routeName} onChange={(e) => set('routeName', e.target.value)} /></Field>
        <Field label="Route Number" required error={errors.routeNumber}><input className={`input ${errors.routeNumber ? 'input-error' : ''}`} value={form.routeNumber} onChange={(e) => set('routeNumber', e.target.value)} /></Field>
        <Field label="Driver Name" required error={errors.driverName}><input className={`input ${errors.driverName ? 'input-error' : ''}`} value={form.driverName} onChange={(e) => set('driverName', e.target.value)} /></Field>
        <Field label="Driver Contact" required error={errors.driverContact}><input className={`input ${errors.driverContact ? 'input-error' : ''}`} value={form.driverContact} maxLength={10} onChange={(e) => set('driverContact', e.target.value)} /></Field>
        <Field label="Bus">
          <select className="input" value={form.busId} onChange={(e) => set('busId', e.target.value)}>
            <option value="">Unassigned</option>
            {buses.map((b) => <option key={b._id} value={b._id}>{b.busNumber} — {b.vehicleNumber}</option>)}
          </select>
        </Field>
        <Field label="Default Monthly Fee (₹)"><input type="number" className="input" value={form.defaultMonthlyFee} onChange={(e) => set('defaultMonthlyFee', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function ViewStudentsModal({ open, route, onClose }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !route) return;
    let mounted = true;
    setLoading(true);
    setStudents([]);
    routeApi.get(route._id)
      .then((d) => mounted && setStudents(d.students || []))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [open, route]);

  return (
    <Modal open={open} onClose={onClose} title={`Students — ${route?.routeName || ''}`} size="lg">
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-accent" /></div>
      ) : students.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs font-semibold uppercase text-text-secondary"><th className="py-2 pr-3">Name</th><th className="py-2 pr-3">Class</th><th className="py-2 pr-3">Mobile</th><th className="py-2 pr-3 text-right">Fee</th><th className="py-2 text-center">Status</th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 font-medium">{s.name}</td>
                  <td className="py-2 pr-3">{s.class}-{s.section}</td>
                  <td className="py-2 pr-3 text-text-secondary">{s.mobile}</td>
                  <td className="py-2 pr-3 text-right font-mono">{formatCurrency(s.monthlyFee)}</td>
                  <td className="py-2 text-center"><Badge variant={s.status === 'active' ? 'active' : 'inactive'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No students on this route" />
      )}
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
