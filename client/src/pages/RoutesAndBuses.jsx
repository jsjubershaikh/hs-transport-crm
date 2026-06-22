import { useState, useEffect } from 'react';
import { Map, Route as RouteIcon, Bus, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import RouteCard from '../components/RouteCard.jsx';
import DataTable from '../components/DataTable.jsx';
import { OccupancyBar } from '../components/BusCard.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Badge from '../components/Badge.jsx';
import { SkeletonCards } from '../components/Skeleton.jsx';
import { useRoutes } from '../hooks/useRoutes.js';
import { useBuses } from '../hooks/useBuses.js';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { routeApi, busApi } from '../api/endpoints.js';
import { formatCurrency } from '../utils/format.js';

const ROUTE_EMPTY = { routeName: '', routeNumber: '', driverName: '', driverContact: '', busId: '', defaultMonthlyFee: '' };
const BUS_EMPTY   = { busNumber: '', vehicleNumber: '', capacity: '', driverName: '', driverContact: '', assignedRouteId: '' };

const TABS = ['Routes', 'Buses'];

export default function RoutesAndBuses() {
  const [tab, setTab] = useState('Routes');

  return (
    <div className="space-y-0">
      <PageHeader title="Routes & Buses" subtitle="Manage transport routes and fleet" icon={Map} />

      {/* Tab switcher */}
      <div className="mb-5 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition ${
              tab === t ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'Routes' ? <RouteIcon size={15} /> : <Bus size={15} />}
            {t}
            {tab === t && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-accent" />}
          </button>
        ))}
      </div>

      {tab === 'Routes' && <RoutesTab />}
      {tab === 'Buses'  && <BusesTab />}
    </div>
  );
}

/* ─── Routes Tab ─────────────────────────────────────── */
function RoutesTab() {
  const { data: routes, loading, refetch } = useRoutes();
  const { buses, reloadAll } = useData();
  const { toast } = useUI();
  const [editing, setEditing]   = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [viewing, setViewing]   = useState(null);

  const save = async (form) => {
    const body = { ...form, defaultMonthlyFee: Number(form.defaultMonthlyFee) || 0, busId: form.busId || null };
    if (editing?._id) await routeApi.update(editing._id, body);
    else await routeApi.create(body);
    toast.success(editing?._id ? 'Route updated' : 'Route created');
    refetch(); reloadAll(); setEditing(null);
  };

  const handleDelete = async () => {
    try {
      await routeApi.remove(toDelete._id);
      toast.success('Route deleted');
      refetch(); reloadAll();
    } catch (e) { toast.error(e.normalizedMessage || 'Cannot delete route'); }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn btn-secondary btn-md" onClick={() => setEditing(ROUTE_EMPTY)}>
          <Plus size={16} /> Add Route
        </button>
      </div>

      {loading ? (
        <SkeletonCards count={4} />
      ) : routes.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {routes.map((r) => (
            <RouteCard key={r._id} route={r} onEdit={setEditing} onDelete={setToDelete} onView={setViewing} />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={RouteIcon} title="No routes yet" message="Create your first route to assign students."
            action={<button className="btn btn-primary btn-md" onClick={() => setEditing(ROUTE_EMPTY)}><Plus size={16} /> Add Route</button>} />
        </div>
      )}

      <RouteFormModal open={!!editing} route={editing} buses={buses} onClose={() => setEditing(null)} onSave={save} />
      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete}
        title="Delete route?" message={`Delete ${toDelete?.routeName}? Routes with students cannot be deleted until reassigned.`} confirmLabel="Delete" />
      <ViewStudentsModal open={!!viewing} route={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

/* ─── Buses Tab ──────────────────────────────────────── */
function BusesTab() {
  const { data: buses, loading, refetch } = useBuses();
  const { routes, reloadAll } = useData();
  const { toast } = useUI();
  const [editing, setEditing]   = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const save = async (form) => {
    const body = { ...form, capacity: Number(form.capacity), assignedRouteId: form.assignedRouteId || null };
    if (editing?._id) await busApi.update(editing._id, body);
    else await busApi.create(body);
    toast.success(editing?._id ? 'Bus updated' : 'Bus added');
    refetch(); reloadAll(); setEditing(null);
  };

  const handleDelete = async () => {
    try {
      await busApi.remove(toDelete._id);
      toast.success('Bus deleted');
      refetch(); reloadAll();
    } catch (e) { toast.error(e.normalizedMessage || 'Cannot delete bus'); }
  };

  const columns = [
    { key: 'busNumber',     header: 'Bus #',    render: (b) => <span className="font-semibold text-text-primary">{b.busNumber}</span> },
    { key: 'vehicleNumber', header: 'Vehicle #', render: (b) => <span className="font-mono text-text-secondary">{b.vehicleNumber}</span> },
    { key: 'capacity',      header: 'Capacity',  align: 'center' },
    { key: 'driverName',    header: 'Driver',    render: (b) => b.driverName || '—' },
    { key: 'driverContact', header: 'Contact',   render: (b) => <span className="text-text-secondary">{b.driverContact || '—'}</span> },
    { key: 'route',         header: 'Route',     render: (b) => b.assignedRouteId?.routeName || <span className="text-text-secondary">Unassigned</span> },
    { key: 'occupancy',     header: 'Occupancy', render: (b) => <OccupancyBar occupied={b.occupied} capacity={b.capacity} /> },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (b) => (
        <div className="flex items-center justify-end gap-1">
          <button className="btn btn-ghost btn-sm px-2" onClick={() => setEditing(b)} title="Edit"><Pencil size={15} /></button>
          <button className="btn btn-ghost btn-sm px-2 text-danger" onClick={() => setToDelete(b)} title="Delete"><Trash2 size={15} /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn btn-secondary btn-md" onClick={() => setEditing(BUS_EMPTY)}>
          <Plus size={16} /> Add Bus
        </button>
      </div>

      <DataTable
        columns={columns}
        data={buses}
        loading={loading}
        empty={<EmptyState icon={Bus} title="No buses yet" message="Add buses to assign them to routes."
          action={<button className="btn btn-primary btn-md" onClick={() => setEditing(BUS_EMPTY)}><Plus size={16} /> Add Bus</button>} />}
      />

      <BusFormModal open={!!editing} bus={editing} routes={routes} onClose={() => setEditing(null)} onSave={save} />
      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete}
        title="Delete bus?" message={`Delete ${toDelete?.busNumber}? Buses with active students must be reassigned first.`} confirmLabel="Delete" />
    </div>
  );
}

/* ─── Route form modal ───────────────────────────────── */
function RouteFormModal({ open, route, buses, onClose, onSave }) {
  const [form, setForm]   = useState(ROUTE_EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

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
    <Modal open={open} onClose={saving ? undefined : onClose} title={route?._id ? 'Edit Route' : 'Add Route'} size="md"
      footer={<><button className="btn btn-outline btn-md" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-secondary btn-md" onClick={submit} disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} Save</button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Route Name"     required error={errors.routeName}><input className={`input ${errors.routeName ? 'input-error' : ''}`} value={form.routeName} onChange={(e) => set('routeName', e.target.value)} /></F>
        <F label="Route Number"   required error={errors.routeNumber}><input className={`input ${errors.routeNumber ? 'input-error' : ''}`} value={form.routeNumber} onChange={(e) => set('routeNumber', e.target.value)} /></F>
        <F label="Driver Name"    required error={errors.driverName}><input className={`input ${errors.driverName ? 'input-error' : ''}`} value={form.driverName} onChange={(e) => set('driverName', e.target.value)} /></F>
        <F label="Driver Contact" required error={errors.driverContact}><input className={`input ${errors.driverContact ? 'input-error' : ''}`} value={form.driverContact} maxLength={10} onChange={(e) => set('driverContact', e.target.value)} /></F>
        <F label="Bus">
          <select className="input" value={form.busId} onChange={(e) => set('busId', e.target.value)}>
            <option value="">Unassigned</option>
            {buses.map((b) => <option key={b._id} value={b._id}>{b.busNumber} — {b.vehicleNumber}</option>)}
          </select>
        </F>
        <F label="Default Monthly Fee (₹)"><input type="number" className="input" value={form.defaultMonthlyFee} onChange={(e) => set('defaultMonthlyFee', e.target.value)} /></F>
      </div>
    </Modal>
  );
}

/* ─── Bus form modal ─────────────────────────────────── */
function BusFormModal({ open, bus, routes, onClose, onSave }) {
  const [form, setForm]   = useState(BUS_EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !bus) return;
    setForm({
      busNumber: bus.busNumber || '', vehicleNumber: bus.vehicleNumber || '',
      capacity: bus.capacity ?? '', driverName: bus.driverName || '', driverContact: bus.driverContact || '',
      assignedRouteId: bus.assignedRouteId?._id || bus.assignedRouteId || '',
    });
    setErrors({});
  }, [open, bus]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const submit = async () => {
    const e = {};
    if (!form.busNumber?.trim()) e.busNumber = 'Required';
    if (!form.vehicleNumber?.trim()) e.vehicleNumber = 'Required';
    if (!form.capacity || Number(form.capacity) < 1) e.capacity = 'Min 1';
    if (form.driverContact && !/^[0-9]{10}$/.test(form.driverContact)) e.driverContact = '10-digit number';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try { await onSave(form); } catch (err) { setErrors({ vehicleNumber: err.normalizedMessage }); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={saving ? undefined : onClose} title={bus?._id ? 'Edit Bus' : 'Add Bus'} size="md"
      footer={<><button className="btn btn-outline btn-md" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-secondary btn-md" onClick={submit} disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} Save</button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Bus Number"     required error={errors.busNumber}><input className={`input ${errors.busNumber ? 'input-error' : ''}`} value={form.busNumber} onChange={(e) => set('busNumber', e.target.value)} placeholder="BUS-05" /></F>
        <F label="Vehicle Number" required error={errors.vehicleNumber}><input className={`input ${errors.vehicleNumber ? 'input-error' : ''}`} value={form.vehicleNumber} onChange={(e) => set('vehicleNumber', e.target.value)} placeholder="MH-12-XX-0000" /></F>
        <F label="Capacity"       required error={errors.capacity}><input type="number" className={`input ${errors.capacity ? 'input-error' : ''}`} value={form.capacity} onChange={(e) => set('capacity', e.target.value)} /></F>
        <F label="Driver Name"><input className="input" value={form.driverName} onChange={(e) => set('driverName', e.target.value)} /></F>
        <F label="Driver Contact" error={errors.driverContact}><input className={`input ${errors.driverContact ? 'input-error' : ''}`} value={form.driverContact} maxLength={10} onChange={(e) => set('driverContact', e.target.value)} /></F>
        <F label="Assigned Route">
          <select className="input" value={form.assignedRouteId} onChange={(e) => set('assignedRouteId', e.target.value)}>
            <option value="">Unassigned</option>
            {routes.map((r) => <option key={r._id} value={r._id}>{r.routeName}</option>)}
          </select>
        </F>
      </div>
    </Modal>
  );
}

/* ─── View students on a route ───────────────────────── */
function ViewStudentsModal({ open, route, onClose }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!open || !route) return;
    let mounted = true;
    setLoading(true); setStudents([]);
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
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase text-text-secondary">
                <th className="py-2 pr-3">Name</th><th className="py-2 pr-3">Class</th>
                <th className="py-2 pr-3">Mobile</th><th className="py-2 pr-3 text-right">Fee</th>
                <th className="py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 font-medium">{s.name}</td>
                  <td className="py-2 pr-3">{s.class}</td>
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

function F({ label, required, error, children }) {
  return (
    <div>
      <label className="label">{label} {required && <span className="text-danger">*</span>}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
