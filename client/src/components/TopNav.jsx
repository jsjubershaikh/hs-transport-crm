import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bell, ChevronDown, LogOut, CalendarRange, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useNotifications } from '../hooks/useNotifications.js';
import Avatar from './Avatar.jsx';

const TITLES = {
  dashboard: 'Dashboard',
  students: 'Students',
  'students/add': 'Add Student',
  fees: 'Fee Management',
  receipts: 'Receipts',
  'routes-buses': 'Routes & Buses',
  routes: 'Routes & Buses',
  buses: 'Routes & Buses',
  subadmins: 'Sub Admins',
  alumni: 'Alumni & Inactive',
  reports: 'Reports',
  archive: 'Academic Years',
  'daily-collection': 'Daily Collection',
  'academic-years': 'Academic Years',
  notifications: 'Notifications',
  settings: 'Settings',
};

function deriveTitle(pathname) {
  const seg = pathname.replace('/app/', '').split('/');
  if (seg[0] === 'students' && seg[1] && seg[1] !== 'add') return 'Student Profile';
  return TITLES[seg.join('/')] || TITLES[seg[0]] || 'Dashboard';
}

export default function TopNav() {
  const { user, logout } = useAuth();
  const { setMobileSidebarOpen, selectedYearId, setSelectedYearId } = useUI();
  const { years } = useData();
  const { unreadCount } = useNotifications({ limit: 1 });
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const title = deriveTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-lg no-print">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="rounded-lg p-2 text-text-secondary hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading text-lg font-bold text-text-primary">{title}</h2>
          <p className="hidden text-xs text-text-secondary sm:block">Home / {title}</p>
        </div>

        {/* Academic year selector */}
        <div className="relative hidden items-center sm:flex">
          <CalendarRange size={15} className="pointer-events-none absolute left-2.5 text-accent" />
          <select
            value={selectedYearId || ''}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="input h-10 w-auto cursor-pointer border-primary/20 bg-primary/[0.03] pl-8 pr-7 text-sm font-semibold text-primary"
            title="Academic year"
          >
            {years.map((y) => (
              <option key={y._id} value={y._id}>
                {y.label} {y.isCurrent ? '• Current' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Notification bell */}
        <button
          onClick={() => navigate('/app/notifications')}
          className="relative rounded-lg p-2 text-text-secondary transition hover:bg-slate-100 hover:text-primary"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-slate-100"
          >
            <Avatar src={user?.photo} name={user?.name} size="sm" />
            <ChevronDown size={16} className="hidden text-text-secondary sm:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 animate-scale-in overflow-hidden rounded-xl border border-border bg-white shadow-modal">
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-sm font-semibold text-text-primary">{user?.name}</p>
                <p className="truncate text-xs text-text-secondary">@{user?.username}</p>
                <span className="mt-1 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                  {user?.role === 'superadmin' ? 'Super Admin' : 'Route Manager'}
                </span>
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/app/settings'); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-primary hover:bg-slate-100"
                >
                  <User size={16} /> Profile & Settings
                </button>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Year selector (mobile) */}
      <div className="border-t border-border px-4 py-2 sm:hidden">
        <select
          value={selectedYearId || ''}
          onChange={(e) => setSelectedYearId(e.target.value)}
          className="input h-9 w-full cursor-pointer text-sm font-semibold text-primary"
        >
          {years.map((y) => (
            <option key={y._id} value={y._id}>
              {y.label} {y.isCurrent ? '• Current' : ''}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
