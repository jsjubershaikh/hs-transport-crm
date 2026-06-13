import { useState, useEffect } from 'react';
import { Bus, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import { OccupancyBar } from '../components/BusCard.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useBuses } from '../hooks/useBuses.js';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { busApi } from '../api/endpoints.js';

const EMPTY = { busNumber: '', vehicleNumber: '', capacity: '', driverName: '', driverContact: '', assignedRouteId: '' };

export default function Buses() {
  const { data: buses, loading, refetch } = useBuses();
  const { routes, reloadAll } = useData();
  const { toast } = useUI();
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const save = async (form) => {
    const body = { ...form, capacity: Number(form.capacity), assignedRouteId: form.assignedRouteId || null };
    if (editing?._id) await busApi.update(editing._id, body);
    else await busApi.create(body);
    toast.success(editing?._id ? 'Bus updated' : 'Bus added');
    refetch(); reloadAll();
    setEditing(null);
  };

  const handleDelete = async () => {
    try {
      await busApi.remove(toDelete._id);
      toast.success('Bus deleted');
      refetch(); reloadAll();
    } catch (e) {
      toast.error(e.normalizedMessage || 'Cannot delete bus');
    }
  };

  const columns = [
    { key: 'busNumber', header: 'Bus #', render: (b) => <span className="font-semibold text-text-primary">{b.busNumber}</span> },
    { key: 'vehicleNumber', header: 'Vehicle #', render: (b) => <span className="font-mono text-text-secondary">{b.vehicleNumber}</span> },
    { key: 'capacity', header: 'Capacity', align: 'center' },
    { key: 'driverName', header: 'Driver', render: (b) => b.driverName || '—' },
    { key: 'driverContact', header: 'Contact', render: (b) => <span className="text-text-secondary">{b.driverContact || '—'}</span> },
    { key: 'route', header: 'Route', render: (b) => b.assignedRouteId?.routeName || <span className="text-text-secondary">Unassigned</span> },
    { key: 'occupancy', header: 'Occupancy', render: (b) => <OccupancyBar occupied={b.occupied} capacity={b.capacity} /> },
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
      <PageHeader
        title="Bus Management"
        subtitle={`${buses.length} buses in the fleet`}
        icon={Bus}
        actions={<button className="btn btn-secondary btn-md" onClick={() => setEditing(EMPTY)}><Plus size={16} /> Add Bus</button>}
      />

      <DataTable
        columns={columns}
        data={buses}
        loading={loading}
        empty={<EmptyState icon={Bus} title="No buses yet" message="Add buses to assign them to routes." action={<button className="btn btn-primary btn-md" onClick={() => setEditing(EMPTY)}><Plus size={16} /> Add Bus</button>} />}
      />

      <BusFormModal open={!!editing} bus={editing} routes={routes} onClose={() => setEditing(null)} onSave={save} />
      <ConfirmModal open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete} title="Delete bus?" message={`Delete ${toDelete?.busNumber}? Buses with active students must be reassigned first.`} confirmLabel="Delete" />
    </div>
  );
}

function BusFormModal({ open, bus, routes, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
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
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={bus?._id ? 'Edit Bus' : 'Add Bus'}
      size="md"
      footer={<>
        <button className="btn btn-outline btn-md" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-secondary btn-md" onClick={submit} disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />} Save</button>
      </>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bus Number" required error={errors.busNumber}><input className={`input ${errors.busNumber ? 'input-error' : ''}`} value={form.busNumber} onChange={(e) => set('busNumber', e.target.value)} placeholder="BUS-05" /></Field>
        <Field label="Vehicle Number" required error={errors.vehicleNumber}><input className={`input ${errors.vehicleNumber ? 'input-error' : ''}`} value={form.vehicleNumber} onChange={(e) => set('vehicleNumber', e.target.value)} placeholder="MH-12-XX-0000" /></Field>
        <Field label="Capacity" required error={errors.capacity}><input type="number" className={`input ${errors.capacity ? 'input-error' : ''}`} value={form.capacity} onChange={(e) => set('capacity', e.target.value)} /></Field>
        <Field label="Driver Name"><input className="input" value={form.driverName} onChange={(e) => set('driverName', e.target.value)} /></Field>
        <Field label="Driver Contact" error={errors.driverContact}><input className={`input ${errors.driverContact ? 'input-error' : ''}`} value={form.driverContact} maxLength={10} onChange={(e) => set('driverContact', e.target.value)} /></Field>
        <Field label="Assigned Route">
          <select className="input" value={form.assignedRouteId} onChange={(e) => set('assignedRouteId', e.target.value)}>
            <option value="">Unassigned</option>
            {routes.map((r) => <option key={r._id} value={r._id}>{r.routeName}</option>)}
          </select>
        </Field>
      </div>
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
