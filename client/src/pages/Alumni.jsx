import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users2, Search, FileSpreadsheet, GraduationCap, UserX, Eye } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { reportApi } from '../api/endpoints.js';
import { useUI } from '../context/UIContext.jsx';
import { exportToExcel } from '../utils/exporters.js';

const TABS = ['Inactive Students', 'Class Alumni'];

export default function Alumni() {
  const { toast } = useUI();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Inactive Students');
  const [alumni, setAlumni] = useState([]);
  const [inactive, setInactive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportApi.alumni();
      setAlumni(res.rows || []);
      setInactive(res.inactive || []);
    } catch (e) {
      toast.error(e.normalizedMessage || 'Failed to load');
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filterRows = (rows) => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.name?.toLowerCase().includes(q) ||
      r.fatherName?.toLowerCase().includes(q) ||
      r.mobile?.includes(q) ||
      r.school?.toLowerCase().includes(q)
    );
  };

  const filteredAlumni   = filterRows(alumni);
  const filteredInactive = filterRows(inactive);

  const exportAlumni = () => {
    const rows = filteredAlumni;
    if (!rows.length) return toast.warning('Nothing to export');
    exportToExcel('alumni', [
      { key: 'name', label: 'Name' },
      { key: 'fatherName', label: "Father's Name" },
      { key: 'mobile', label: 'Mobile' },
      { key: 'school', label: 'School' },
      { key: 'academicYearId.label', label: 'Academic Year' },
      { key: 'routeId.routeName', label: 'Route' },
    ], rows, 'Alumni');
    toast.success(`Exported ${rows.length} alumni`);
  };

  const exportInactive = () => {
    const rows = filteredInactive;
    if (!rows.length) return toast.warning('Nothing to export');
    exportToExcel('inactive-students', [
      { key: 'name', label: 'Name' },
      { key: 'fatherName', label: "Father's Name" },
      { key: 'mobile', label: 'Mobile' },
      { key: 'class', label: 'Class' },
      { key: 'school', label: 'School' },
      { key: 'academicYearId.label', label: 'Academic Year' },
      { key: 'routeId.routeName', label: 'Route' },
    ], rows, 'Inactive Students');
    toast.success(`Exported ${rows.length} inactive students`);
  };

  if (loading) return <LoadingSpinner label="Loading…" />;

  return (
    <div>
      <PageHeader
        title="Alumni & Inactive"
        subtitle={`${inactive.length} inactive · ${alumni.length} passed-out`}
        icon={Users2}
      />

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition ${
              tab === t ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'Inactive Students' ? <UserX size={15} /> : <GraduationCap size={15} />}
            {t}
            {t === 'Inactive Students' && inactive.length > 0 && (
              <span className="ml-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                {inactive.length}
              </span>
            )}
            {tab === t && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-accent" />}
          </button>
        ))}
      </div>

      {/* Search + export bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            className="input pl-9"
            placeholder="Search by name, father, mobile, school…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <button
          className="btn btn-outline btn-md shrink-0"
          onClick={tab === 'Inactive Students' ? exportInactive : exportAlumni}
        >
          <FileSpreadsheet size={15} /> Export
        </button>
      </div>

      {/* ── Inactive Students tab ── */}
      {tab === 'Inactive Students' && (
        filteredInactive.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={UserX}
              title={search ? 'No results found' : 'No inactive students'}
              message={search ? 'Try a different search term.' : 'Students marked inactive will appear here. Use "Mark Inactive" on a student profile.'}
            />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Father's Name</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Academic Year</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInactive.map((s) => (
                    <tr
                      key={s._id}
                      className="border-b border-border/70 last:border-0 hover:bg-slate-50/70 cursor-pointer"
                      onClick={() => navigate(`/app/students/${s._id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={s.photo} name={s.name} size="sm" />
                          <div>
                            <p className="font-medium text-text-primary">{s.name}</p>
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                              <UserX size={9} /> Inactive
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{s.class}</td>
                      <td className="px-4 py-3 text-text-secondary">{s.fatherName || '—'}</td>
                      <td className="px-4 py-3 font-mono text-text-secondary">{s.mobile || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                          {s.academicYearId?.label || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{s.routeId?.routeName || '—'}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-white text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-sm"
                          onClick={() => navigate(`/app/students/${s._id}`)}
                          title="View Profile"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-2.5 text-xs text-text-secondary">
              {filteredInactive.length} inactive student{filteredInactive.length !== 1 ? 's' : ''}
              {search ? ` matching "${search}"` : ''}
            </div>
          </div>
        )
      )}

      {/* ── Class Alumni tab ── */}
      {tab === 'Class Alumni' && (
        filteredAlumni.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={GraduationCap}
              title={search ? 'No results found' : 'No alumni yet'}
              message={search ? 'Try a different search term.' : 'Alumni appear here after students are promoted from Class 10.'}
            />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Father's Name</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3">Academic Year</th>
                    <th className="px-4 py-3">Route</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlumni.map((s) => (
                    <tr
                      key={s._id}
                      className="border-b border-border/70 last:border-0 hover:bg-slate-50/70 cursor-pointer"
                      onClick={() => navigate(`/app/students/${s._id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={s.photo} name={s.name} size="sm" />
                          <div>
                            <p className="font-medium text-text-primary">{s.name}</p>
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              <GraduationCap size={9} /> Alumni
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{s.fatherName || '—'}</td>
                      <td className="px-4 py-3 font-mono text-text-secondary">{s.mobile || '—'}</td>
                      <td className="px-4 py-3 text-text-secondary">{s.school || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                          {s.academicYearId?.label || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{s.routeId?.routeName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-2.5 text-xs text-text-secondary">
              Showing {filteredAlumni.length} of {alumni.length} alumni
            </div>
          </div>
        )
      )}
    </div>
  );
}
