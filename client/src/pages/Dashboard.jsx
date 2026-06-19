import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, Route as RouteIcon, Bus, AlertCircle, IndianRupee, ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import StatCard from '../components/StatCard.jsx';
import ChartCard from '../components/ChartCard.jsx';
import Avatar from '../components/Avatar.jsx';
import Badge from '../components/Badge.jsx';
import { SkeletonCards } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { dashboardApi } from '../api/endpoints.js';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useRealtime } from '../hooks/useRealtime.js';
import { formatCurrency, formatDate, timeAgo } from '../utils/format.js';
import { MONTH_LABELS } from '../utils/constants.js';

const PIE_COLORS = ['#16A34A', '#DC2626', '#D97706'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { selectedYearId } = useUI();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoginBanner, setShowLoginBanner] = useState(false);
  const bannerShown = useRef(false);

  // Show login notification banner once per session
  useEffect(() => {
    const key = 'ht_login_banner_shown';
    if (!sessionStorage.getItem(key) && !bannerShown.current) {
      bannerShown.current = true;
      sessionStorage.setItem(key, '1');
      setShowLoginBanner(true);
      const t = setTimeout(() => setShowLoginBanner(false), 5000);
      return () => clearTimeout(t);
    }
  }, []);

  const load = useCallback(async () => {
    if (!selectedYearId) {
      setLoading(false); // don't hang on skeleton if no year is selected yet
      return;
    }
    try {
      setStats(await dashboardApi.stats(selectedYearId));
    } finally {
      setLoading(false);
    }
  }, [selectedYearId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Live: refetch when fees/students change anywhere in scope.
  useRealtime(['fee:updated', 'student:created', 'student:deleted', 'receipt:created'], load);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <SkeletonCards count={4} />
        <SkeletonCards count={2} />
      </div>
    );
  }

  const c = stats.cards;
  const cards = [
    { icon: Users, label: 'Total Students', value: c.totalStudents, variant: 'navy', trend: 8 },
    { icon: UserCheck, label: 'Active Students', value: c.activeStudents, variant: 'green', trend: 5 },
    { icon: RouteIcon, label: 'Total Routes', value: c.totalRoutes, variant: 'blue' },
    { icon: Bus, label: 'Total Buses', value: c.totalBuses, variant: 'purple' },
  ];

  const monthData       = stats.charts.monthlyCollection.map((m) => ({ ...m, label: MONTH_LABELS[m.month]?.slice(0, 3) || m.month }));
  const studentGrowthData = stats.charts.studentGrowth.map((m) => ({ ...m, label: MONTH_LABELS[m.month]?.slice(0, 3) || m.month }));

  return (
    <div className="space-y-6">
      {/* Login notification banner */}
      {showLoginBanner && (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success animate-fade-slide-up">
          <Sparkles size={18} className="shrink-0" />
          <span>You are now logged in as <strong>{user?.role === 'superadmin' ? 'Super Admin' : 'Route Manager'}</strong>. Welcome back, <strong>{user?.name}</strong>!</span>
          <button onClick={() => setShowLoginBanner(false)} className="ml-auto shrink-0 rounded p-0.5 hover:bg-success/20" aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* Greeting */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-white px-6 py-5 shadow-sm animate-fade-slide-up">
        <Avatar name={user?.name} size="lg" />
        <div>
          <p className="text-sm text-text-secondary">{getGreeting()},</p>
          <h1 className="font-heading text-2xl font-extrabold text-text-primary">Hello, {user?.name} 👋</h1>
          <span className="inline-block mt-1 rounded-full bg-accent/15 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent">
            {user?.role === 'superadmin' ? 'Super Admin' : 'Route Manager'}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card, i) => (
          <StatCard key={card.label} {...card} style={{ animationDelay: `${i * 50}ms` }} />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Monthly Collection" subtitle={`Per academic month — includes advance payments · ${stats.yearLabel || ''}`}>
          <ResponsiveContainer>
            <BarChart data={monthData} margin={{ left: -12, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
              <Bar dataKey="collected" name="Collected" fill="#0B1F4B" radius={[5, 5, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fee Breakdown" subtitle="Received vs Pending vs Partial">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={stats.charts.feeBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3}>
                {stats.charts.feeBreakdown.map((entry, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Student Growth" subtitle="Cumulative through the year">
          <ResponsiveContainer>
            <LineChart data={studentGrowthData} margin={{ left: -12, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="students" name="Students" stroke="#F97316" strokeWidth={2.5} dot={{ r: 3, fill: '#F97316' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Route-wise Collection" subtitle="Collected vs pending per route">
          <ResponsiveContainer>
            <BarChart data={stats.charts.routeWise} margin={{ left: -12, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="routeNumber" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={tooltipStyle} />
              <Legend iconType="circle" />
              <Bar dataKey="collected" name="Collected" fill="#16A34A" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="pending" name="Pending" fill="#FECACA" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent activity */}
      <div className="grid gap-5 lg:grid-cols-3">
        <RecentCard title="Recently Added Students" link="/app/students">
          {stats.recent.students.length ? (
            stats.recent.students.map((s) => (
              <Link to={`/app/students/${s._id}`} key={s._id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                <Avatar src={s.photo} name={s.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{s.name}</p>
                  <p className="text-xs text-text-secondary">Class {s.class}</p>
                </div>
                <span className="text-xs text-text-secondary">{formatDate(s.createdAt)}</span>
              </Link>
            ))
          ) : (
            <EmptyMini text="No students yet" />
          )}
        </RecentCard>

        <RecentCard title="Recent Payments" link="/app/receipts">
          {stats.recent.payments.length ? (
            stats.recent.payments.map((p) => (
              <div key={p._id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success"><IndianRupee size={16} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{p.studentName}</p>
                  <p className="font-mono text-xs text-text-secondary">{p.receiptNumber}</p>
                </div>
                <span className="text-sm font-semibold text-success">{formatCurrency(p.amount)}</span>
              </div>
            ))
          ) : (
            <EmptyMini text="No payments recorded" />
          )}
        </RecentCard>

        <RecentCard title="Pending Fee Alerts" link="/app/fees">
          {stats.recent.pendingAlerts.length ? (
            stats.recent.pendingAlerts.map((a) => (
              <div key={a._id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger/10 text-danger"><AlertCircle size={16} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{a.studentName}</p>
                  <p className="text-xs text-text-secondary">{MONTH_LABELS[a.month] || a.month}</p>
                </div>
                <span className="text-sm font-semibold text-danger">{formatCurrency(a.remainingAmount)}</span>
              </div>
            ))
          ) : (
            <EmptyMini text="No pending dues 🎉" />
          )}
        </RecentCard>
      </div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  boxShadow: '0 4px 16px rgba(0,0,0,.08)',
  fontSize: 13,
};

function RecentCard({ title, link, children }) {
  return (
    <div className="card p-5 animate-fade-slide-up">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-sm font-bold text-text-primary">{title}</h3>
        <Link to={link} className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
          View all <ArrowRight size={12} />
        </Link>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function EmptyMini({ text }) {
  return <p className="py-6 text-center text-sm text-text-secondary">{text}</p>;
}
