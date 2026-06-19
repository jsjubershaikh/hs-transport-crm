import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, Eye, Pencil, Trash2, FileSpreadsheet, FileText, Download } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import FilterBar from '../components/FilterBar.jsx';
import DataTable from '../components/DataTable.jsx';
import Avatar from '../components/Avatar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useStudents } from '../hooks/useStudents.js';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { studentApi } from '../api/endpoints.js';
import { exportToCSV, exportToExcel } from '../utils/exporters.js';
import { CLASSES, GENDERS, CLASS_GROUPS } from '../utils/constants.js';

export default function StudentList() {
  const navigate = useNavigate();
  const { routes, selectedYear } = useData();
  const { selectedYearId } = useUI();
  const { toast } = useUI();
  const { isSuperAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // default: active only
  const [group, setGroup] = useState('all');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);

  const params = useMemo(
    () => ({
      page, limit: 20, search: search || undefined, class: classFilter || undefined,
      gender: genderFilter || undefined, routeId: routeFilter || undefined,
      status: statusFilter || undefined, academicYearId: selectedYearId || undefined,
      expandSiblings: true, // include siblings as their own rows (linked to primary)
    }),
    [page, search, classFilter, genderFilter, routeFilter, statusFilter, selectedYearId]
  );

  // A sibling row links to its primary's profile; a primary links to itself.
  const profileId = (s) => (s.isSibling ? s.primaryStudentId : s._id);

  const { data, meta, loading, refetch } = useStudents(params);

  // Client-side class-group tab filter on top of the server page.
  const grouped = useMemo(() => {
    const g = CLASS_GROUPS.find((x) => x.key === group) || CLASS_GROUPS[0];
    return data.filter((s) => g.match(s.class));
  }, [data, group]);

  const resetPage = (fn) => (v) => { fn(v); setPage(1); };

  const handleDelete = async () => {
    await studentApi.remove(toDelete._id);
    toast.success('Student deleted');
    refetch();
  };

  // One row per student (primaries + siblings), matching exactly what the list shows.
  const exportCols = [
    { key: 'isSibling',         label: 'Type', format: (v) => (v ? 'Sibling' : 'Primary') },
    { key: 'name',              label: 'Name' },
    { key: 'fatherName',        label: 'Father Name' },
    { key: 'mobile',            label: 'Mobile' },
    { key: 'class',             label: 'Class' },
    { key: 'section',           label: 'Section' },
    { key: 'gender',            label: 'Gender' },
    { key: 'school',            label: 'School' },
    { key: 'routeId.routeName', label: 'Route' },
    { key: 'busId.busNumber',   label: 'Bus' },
    { key: 'pickupPoint',       label: 'Pickup & Drop Point' },
    { key: 'monthlyFee',        label: 'Monthly Fee' },
    { key: 'status',            label: 'Status' },
  ];

  const doExport = async (kind) => {
    if (kind === 'pdf') { window.print(); return; }
    try {
      // Fetch every row matching the current server-side filters (all pages),
      // then apply the active class-group tab so the export = what's visible.
      const res = await studentApi.list({ ...params, page: 1, limit: 10000 });
      const g = CLASS_GROUPS.find((x) => x.key === group) || CLASS_GROUPS[0];
      const rows = (res.data || []).filter((s) => g.match(s.class));
      if (!rows.length) return toast.warning('Nothing to export');
      const name = `students-${selectedYear?.label || 'all'}`;
      if (kind === 'csv') exportToCSV(name, exportCols, rows);
      else exportToExcel(name, exportCols, rows, 'Students');
      toast.success(`Exported ${rows.length} student${rows.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const columns = [
    {
      key: 'student', header: 'Student',
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar src={s.photo} name={s.name} size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-text-primary">{s.name}</p>
              {s.isSibling ? (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">Sibling</span>
              ) : s.siblingCount > 0 ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">+{s.siblingCount} sibling{s.siblingCount > 1 ? 's' : ''}</span>
              ) : null}
            </div>
            <p className="text-xs text-text-secondary">
              {s.isSibling ? `Sibling of ${s.primaryName}` : s.mobile}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'fatherName', header: 'Father', render: (s) => <span className="text-text-secondary">{s.fatherName}</span> },
    { key: 'class', header: 'Class', render: (s) => <span className="font-medium">{s.class}{s.section ? `-${s.section}` : ''}</span> },
    { key: 'route', header: 'Route', render: (s) => <span className="text-text-secondary">{s.routeId?.routeName || '—'}</span> },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm px-2" onClick={() => navigate(`/app/students/${profileId(s)}`)} title={s.isSibling ? 'View primary profile' : 'View'}><Eye size={16} /></button>
          <button className="btn btn-ghost btn-sm px-2" onClick={() => navigate(`/app/students/${profileId(s)}`)} title={s.isSibling ? 'Edit in primary profile' : 'Edit'}><Pencil size={15} /></button>
          {isSuperAdmin && !s.isSibling && (
            <button className="btn btn-ghost btn-sm px-2 text-danger" onClick={() => setToDelete(s)} title="Delete"><Trash2 size={15} /></button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={meta ? `${meta.total} students in ${selectedYear?.label || 'current year'}` : 'Manage student records'}
        icon={GraduationCap}
        actions={<button className="btn btn-secondary btn-md" onClick={() => navigate('/app/students/add')}><Plus size={16} /> Add Student</button>}
      />

      <FilterBar
        search={search}
        onSearch={resetPage(setSearch)}
        searchPlaceholder="Search name, mobile, class…"
        filters={[
          { key: 'class', value: classFilter, onChange: resetPage(setClassFilter), placeholder: 'All Classes', options: CLASSES.map((c) => ({ value: c, label: c })) },
          { key: 'gender', value: genderFilter, onChange: resetPage(setGenderFilter), placeholder: 'All Genders', options: GENDERS.map((g) => ({ value: g, label: g })) },
          ...(isSuperAdmin ? [{ key: 'route', value: routeFilter, onChange: resetPage(setRouteFilter), placeholder: 'All Routes', options: routes.map((r) => ({ value: r._id, label: r.routeName })) }] : []),
          { key: 'status', value: statusFilter, onChange: resetPage(setStatusFilter), placeholder: 'Active only', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: '', label: 'All Students' }] },
        ]}
        right={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => doExport('excel')}><FileSpreadsheet size={15} /> Excel</button>
            <button className="btn btn-outline btn-sm" onClick={() => doExport('csv')}><Download size={15} /> CSV</button>
            <button className="btn btn-outline btn-sm" onClick={() => doExport('pdf')}><FileText size={15} /> PDF</button>
          </>
        }
      />

      {/* Grouping tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {CLASS_GROUPS.map((g) => (
          <button
            key={g.key}
            onClick={() => setGroup(g.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              group === g.key ? 'bg-primary text-white' : 'bg-white text-text-secondary hover:bg-slate-100'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={grouped}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onRowClick={(s) => navigate(`/app/students/${profileId(s)}`)}
        rowClassName={(s) => (s.isSibling ? 'bg-slate-50/70 hover:bg-slate-100/80' : undefined)}
        empty={<EmptyState icon={GraduationCap} title="No students found" message="Add your first student to get started." action={<button className="btn btn-primary btn-md" onClick={() => navigate('/app/students/add')}><Plus size={16} /> Add Student</button>} />}
      />

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Delete student?"
        message={`This permanently removes ${toDelete?.name} and all their fee records & receipts.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
