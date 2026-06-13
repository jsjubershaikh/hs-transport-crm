import { useRef, useCallback, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import TopNav from '../components/TopNav.jsx';
import { useRealtime } from '../hooks/useRealtime.js';
import { useIdleLogout } from '../hooks/useIdleLogout.js';
import { useUI } from '../context/UIContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const IDLE_MS = 15 * 60 * 1000;  // 15 minutes
const WARN_MS =  1 * 60 * 1000;  //  warn 1 minute before logout

/**
 * App shell: sidebar + topnav + routed content.
 * - Global realtime sync toast
 * - 15-minute idle auto-logout (with 1-minute warning)
 */
export default function DashboardLayout() {
  const { toast } = useUI();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const lastToast = useRef(0);
  const warnTimer = useRef(null);

  // Reset the 1-min warning timer on every user activity
  const resetWarn = useCallback(() => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    warnTimer.current = setTimeout(() => {
      toast.warning('You will be logged out in 1 minute due to inactivity.', 8000);
    }, IDLE_MS - WARN_MS);
  }, [toast]);

  // Start warning timer on mount, clean up on unmount
  useEffect(() => {
    resetWarn();
    return () => { if (warnTimer.current) clearTimeout(warnTimer.current); };
  }, [resetWarn]);

  // Wire activity events to also reset the warning timer
  useEffect(() => {
    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    EVENTS.forEach((e) => window.addEventListener(e, resetWarn, { passive: true }));
    return () => EVENTS.forEach((e) => window.removeEventListener(e, resetWarn));
  }, [resetWarn]);

  // Idle logout — logs out and redirects after 15 min with no activity
  const handleIdleLogout = useCallback(async () => {
    if (warnTimer.current) clearTimeout(warnTimer.current);
    await logout();
    navigate('/login', { replace: true });
    toast.warning('Logged out due to 15 minutes of inactivity.');
  }, [logout, navigate, toast]);

  useIdleLogout(handleIdleLogout, IDLE_MS);

  // Global realtime sync toast (throttled to avoid spam)
  useRealtime(
    ['student:created', 'student:updated', 'student:deleted', 'fee:updated', 'route:updated', 'bus:updated', 'academicYear:promoted'],
    () => {
      const now = Date.now();
      if (now - lastToast.current > 2500) {
        lastToast.current = now;
        toast.info('Data synced from another admin');
      }
    }
  );

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <main className="flex-1 overflow-x-hidden px-4 py-6 pb-[env(safe-area-inset-bottom)] sm:px-6">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
