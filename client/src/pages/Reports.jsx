import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, FileSpreadsheet, FileText, IndianRupee, Users, GraduationCap,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import PageHeader from '../components/PageHeader.jsx';
import ChartCard from '../components/ChartCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { reportApi } from '../api/endpoints.js';
import { useData } from '../context/DataContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { exportToExcel, exportToCSV } from '../utils/exporters.js';
import { formatCurrency } from '../utils/format.js';
import { MONTH_LABELS } from '../utils/constants.js';

const PIE_COLORS = ['#0B1F4B', '#F97316', '#2563EB', '#16A34A', '#7C3AED', '#0891B2', '#DB2777', '#D97706'];
const tip = { borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 13 };

export default function Reports() {
  const { selectedYearId } = useUI();
  const [tab, setTab] = useState('financial');

  return (
    <div>
      <PageHeader title="Reports" subtitle="Financial & student analytics" icon={BarChart3} />
      <div className="mb-5 flex gap-1 border-b border-border">
        {['financial', 'student'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`relative px-4 py-2.5 text-sm font-semibold capitalize transition ${tab === t ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
            {t} Reports
            {tab === t && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-accent" />}
          </button>
        ))}
      </div>
      {tab === 'financial' ? <FinancialReports yearId={selectedYearId} /> : <StudentReports yearId={selectedYearId} />}
    </div>
  );
}

function ExportButtons({ name, columns, rows }) {
  return (
    <div className="flex gap-2">
      <button className="btn btn-outline btn-sm" onClick={() => exportToExcel(name, columns, rows, name)}><FileSpreadsheet size={14} /> Excel</button>
      <button className="btn btn-outline btn-sm" onClick={() => exportToCSV(name, columns, rows)}><FileText size={14} /> CSV</button>
    </div>
  );
}

function FinancialReports({ yearId }) {
  const [monthly, setMonthly] = useState(null);
  const [routeWise, setRouteWise] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, r, c] = await Promise.all([
        reportApi.financialMonthly(yearId),
        reportApi.financialRouteWise({ yearId }),
        reportApi.yearComparison(),
      ]);
      setMonthly(m); setRouteWise(r); setComparison(c);
    } finally { setLoading(false); }
  }, [yearId]);
  useEffect(() => { load(); }, [load]);

  if (loading || !monthly) return <LoadingSpinner label="Building reports…" />;

  const monthData = monthly.series.map((s) => ({ ...s, label: MONTH_LABELS[s.month]?.slice(0, 3) }));

  return (
    <div className="space-y-6">
      {/* Monthly collection */}
      <ChartCard
        title="Monthly Collection"
        subtitle={`Collected vs expected · Total ${formatCurrency(monthly.totals.collected)}`}
        action={<ExportButtons name="monthly-collection" columns={[{ key: 'month', label: 'Month' }, { key: 'expected', label: 'Expected' }, { key: 'collected', label: 'Collected' }, { key: 'pending', label: 'Pending' }]} rows={monthly.series} />}
        height={320}
      >
        <ResponsiveContainer>
          <BarChart data={monthData} margin={{ left: -8, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
            <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tip} />
            <Legend iconType="circle" />
            <Bar dataKey="expected" name="Expected" fill="#E2E8F0" radius={[4, 4, 0, 0]} maxBarSize={26} />
            <Bar dataKey="collected" name="Collected" fill="#0B1F4B" radius={[4, 4, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Route-wise */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Route-wise Collection" subtitle="Collected per route" height={300}>
          <ResponsiveContainer>
            <BarChart data={routeWise.rows} layout="vertical" margin={{ left: 20, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <YAxis type="category" dataKey="routeNumber" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tip} />
              <Bar dataKey="collected" name="Collected" fill="#F97316" radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Year-wise Comparison" subtitle="Collections across academic years" height={300}>
          <ResponsiveContainer>
            <LineChart data={comparison.rows} margin={{ left: -8, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tip} />
              <Legend iconType="circle" />
              <Line type="monotone" dataKey="collected" name="Collected" stroke="#16A34A" strokeWidth={2.5} />
              <Line type="monotone" dataKey="pending" name="Pending" stroke="#DC2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <PendingReport yearId={yearId} />
    </div>
  );
}

function PendingReport({ yearId }) {
  const { routes } = useData();
  const [routeId, setRouteId] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    reportApi.financialPending({ yearId, routeId: routeId || undefined }).then(setData);
  }, [yearId, routeId]);

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-base font-bold text-text-primary">Pending Fees Report</h3>
          <p className="text-xs text-text-secondary">{data ? `${data.count} entries · ${formatCurrency(data.totalPending)} outstanding` : 'Loading…'}</p>
        </div>
        <div className="flex gap-2">
          <select className="input h-9 w-auto" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
            <option value="">All Routes</option>
            {routes.map((r) => <option key={r._id} value={r._id}>{r.routeName}</option>)}
          </select>
          {data && <ExportButtons name="pending-fees" columns={[{ key: 'studentName', label: 'Student' }, { key: 'class', label: 'Class' }, { key: 'routeName', label: 'Route' }, { key: 'month', label: 'Month' }, { key: 'remainingAmount', label: 'Pending' }]} rows={data.rows} />}
        </div>
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white"><tr className="border-b border-border text-left text-xs font-semibold uppercase text-text-secondary"><th className="py-2 pr-3">Student</th><th className="py-2 pr-3">Class</th><th className="py-2 pr-3">Route</th><th className="py-2 pr-3">Month</th><th className="py-2 text-right">Pending</th></tr></thead>
          <tbody>
            {data?.rows?.slice(0, 100).map((r, i) => (
              <tr key={i} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-3 font-medium">{r.studentName}</td>
                <td className="py-2 pr-3">{r.class}</td>
                <td className="py-2 pr-3 text-text-secondary">{r.routeName}</td>
                <td className="py-2 pr-3">{MONTH_LABELS[r.month] || r.month}</td>
                <td className="py-2 text-right font-mono text-danger">{formatCurrency(r.remainingAmount)}</td>
              </tr>
            ))}
            {data && !data.rows.length && <tr><td colSpan={5} className="py-6 text-center text-text-secondary">No pending fees 🎉</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentReports({ yearId }) {
  const [byClass, setByClass] = useState(null);
  const [routeWise, setRouteWise] = useState(null);
  const [admissions, setAdmissions] = useState(null);
  const [alumni, setAlumni] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r, a, al] = await Promise.all([
        reportApi.studentsByClass(yearId),
        reportApi.studentsRouteWise(yearId),
        reportApi.admissions(yearId),
        reportApi.alumni(),
      ]);
      setByClass(c); setRouteWise(r); setAdmissions(a); setAlumni(al);
    } finally { setLoading(false); }
  }, [yearId]);
  useEffect(() => { load(); }, [load]);

  if (loading || !byClass) return <LoadingSpinner label="Building reports…" />;

  const admitData = admissions.series.map((s) => ({ ...s, label: MONTH_LABELS[s.month]?.slice(0, 3) }));

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Students by Class" subtitle={`${byClass.total} active students`} action={<ExportButtons name="students-by-class" columns={[{ key: 'class', label: 'Class' }, { key: 'count', label: 'Count' }]} rows={byClass.series} />} height={300}>
          <ResponsiveContainer>
            <BarChart data={byClass.series} margin={{ left: -8, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="class" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tip} />
              <Bar dataKey="count" name="Students" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Route-wise Students" subtitle="Active students per route" height={300}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={routeWise.rows} dataKey="count" nameKey="routeName" cx="50%" cy="50%" outerRadius={95} label={(e) => e.count}>
                {routeWise.rows.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tip} />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="New Admissions" subtitle="Admissions per month" height={280}>
        <ResponsiveContainer>
          <LineChart data={admitData} margin={{ left: -8, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tip} />
            <Line type="monotone" dataKey="count" name="Admissions" stroke="#F97316" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-text-primary">Alumni</h3>
            <p className="text-xs text-text-secondary">{alumni.count} passed-out students</p>
          </div>
          {alumni.count > 0 && <ExportButtons name="alumni" columns={[{ key: 'name', label: 'Name' }, { key: 'fatherName', label: 'Father' }, { key: 'mobile', label: 'Mobile' }, { key: 'school', label: 'School' }]} rows={alumni.rows} />}
        </div>
        {alumni.rows.length ? (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white"><tr className="border-b border-border text-left text-xs font-semibold uppercase text-text-secondary"><th className="py-2 pr-3">Name</th><th className="py-2 pr-3">Father</th><th className="py-2 pr-3">Mobile</th><th className="py-2">School</th></tr></thead>
              <tbody>
                {alumni.rows.map((a) => (
                  <tr key={a._id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">{a.name}</td>
                    <td className="py-2 pr-3 text-text-secondary">{a.fatherName}</td>
                    <td className="py-2 pr-3">{a.mobile}</td>
                    <td className="py-2 text-text-secondary">{a.school}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-text-secondary">No alumni yet — promote Class 10 students to see them here.</p>
        )}
      </div>
    </div>
  );
}
