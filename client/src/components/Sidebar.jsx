import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, GraduationCap, Wallet, ReceiptText, Map,
  UserCog, BarChart3, Archive, CalendarRange, Settings, LogOut, Bus as BusLogo,
  ChevronLeft, X, Users2, TrendingUp,
} from 'lucide-react';
import { NAV_ITEMS } from '../utils/constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';
import Avatar from './Avatar.jsx';

const ICONS = {
  LayoutDashboard, GraduationCap, Wallet, ReceiptText, Map,
  UserCog, BarChart3, Archive, CalendarRange, Settings, Users2, TrendingUp,
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUI();

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user?.role));

  const NavList = ({ onNavigate, collapsed }) => (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {items.map((item) => {
        const Icon = ICONS[item.icon] || LayoutDashboard;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app/dashboard'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-sidebar-text hover:bg-white/5 hover:text-white'
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r bg-accent" style={{ width: 3 }} />}
                <Icon size={19} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  const Inner = ({ onNavigate, showCollapse, collapsed }) => (
    <div className="flex h-full flex-col bg-sidebar-bg text-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent">
          <BusLogo size={20} />
        </span>
        {!collapsed && (
          <span className="font-heading text-base font-extrabold leading-tight tracking-tight">
            HS<span className="block text-[11px] font-medium text-white/50">Transportation CRM</span>
          </span>
        )}
        {showCollapse && (
          <button onClick={toggleSidebar} className="ml-auto hidden rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white lg:block" aria-label="Collapse sidebar">
            <ChevronLeft size={18} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* User */}
      <div className={`mx-3 mb-2 flex items-center gap-3 rounded-xl bg-white/5 p-3 ${collapsed ? 'justify-center' : ''}`}>
        <Avatar src={user?.photo} name={user?.name} size="sm" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <span className="inline-block rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              {user?.role === 'superadmin' ? 'Super Admin' : 'Route Manager'}
            </span>
          </div>
        )}
      </div>

      <NavList onNavigate={onNavigate} collapsed={collapsed} />

      {/* Logout */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={logout}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-text transition hover:bg-danger/20 hover:text-white ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={19} />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden shrink-0 transition-all duration-250 lg:block ${sidebarCollapsed ? 'w-[76px]' : 'w-[260px]'}`}>
        <div className={`fixed inset-y-0 left-0 ${sidebarCollapsed ? 'w-[76px]' : 'w-[260px]'} transition-all duration-250`}>
          <Inner showCollapse collapsed={sidebarCollapsed} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[260px] animate-slide-in-right">
            <div className="relative h-full">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="absolute right-2 top-3 z-10 rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
              <Inner onNavigate={() => setMobileSidebarOpen(false)} collapsed={false} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
