import { useState, useEffect, useCallback, useMemo } from 'react';
import { Archive as ArchiveIcon, ArrowLeft, Users, IndianRupee, FolderArchive } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import FilterBar from '../components/FilterBar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatCard from '../components/StatCard.jsx';
import { SkeletonCards } from '../components/Skeleton.jsx';
import { archiveApi } from '../api/endpoints.js';
import { formatCurrency } from '../utils/format.js';
import { CLASSES } from '../utils/constants.js';

export default function Archive() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    archiveApi.years().then((d) => setYears(d || [])).finally(() => setLoading(false));
  }, []);

  if (selected) return <ArchiveDetail year={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      <PageHeader title="Archive" subtitle="Read-only records from past academic years" icon={ArchiveIcon} />
      {loading ? (
        <SkeletonCards count={3} />
      ) : years.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {years.map((y) => (
            <button key={y._id} onClick={() => setSelected(y)} className="card card-hover p-5 text-left animate-fade-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><FolderArchive size={22} /></div>
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
        <div className="card"><EmptyState icon={ArchiveIcon} title="No archived years" message="Years appear here after promotion archives them." /></div>
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

  // archiveApi.year returns the full envelope; data = { year, students, summary }.
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
    { key: 'name', header: 'Name', render: (s) => <span className="font-medium text-text-primary">{s.name}</span> },
    { key: 'fatherName', header: 'Father', render: (s) => <span className="text-text-secondary">{s.fatherName}</span> },
    { key: 'class', header: 'Class', render: (s) => `${s.class}-${s.section}` },
    { key: 'route', header: 'Route', render: (s) => s.routeId?.routeName || '—' },
    { key: 'mobile', header: 'Mobile', render: (s) => <span className="text-text-secondary">{s.mobile}</span> },
    { key: 'fee', header: 'Monthly Fee', align: 'right', render: (s) => <span className="font-mono">{formatCurrency(s.monthlyFee)}</span> },
  ];

  return (
    <div>
      <button onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-primary">
        <ArrowLeft size={16} /> Back to archive
      </button>
      <PageHeader title={`Archive — ${year.label}`} subtitle="Read-only historical records" icon={FolderArchive} />

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
