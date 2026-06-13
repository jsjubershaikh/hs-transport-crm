import { createContext, useContext, useState, useCallback, useRef } from 'react';

const UIContext = createContext(null);
export const useUI = () => useContext(UIContext);

let toastSeq = 0;

/**
 * Global UI state:
 * - toast queue (max 3 visible, auto-dismiss 3s)
 * - sidebar open/collapsed (desktop) + mobile drawer
 * - selected academic year (persisted to localStorage for convenience; the DB
 *   remains the source of truth — the id is just a query param)
 */
export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedYearId, setSelectedYearIdState] = useState(
    () => localStorage.getItem('ht_year') || ''
  );
  const timers = useRef({});

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const pushToast = useCallback(
    (type, message, duration = 3000) => {
      const id = ++toastSeq;
      setToasts((prev) => {
        const next = [...prev, { id, type, message }];
        return next.slice(-3); // keep only the latest 3
      });
      timers.current[id] = setTimeout(() => dismissToast(id), duration);
      return id;
    },
    [dismissToast]
  );

  const toast = {
    success: (m, d) => pushToast('success', m, d),
    error: (m, d) => pushToast('error', m, d),
    warning: (m, d) => pushToast('warning', m, d),
    info: (m, d) => pushToast('info', m, d),
  };

  const setSelectedYearId = useCallback((id) => {
    setSelectedYearIdState(id);
    if (id) localStorage.setItem('ht_year', id);
    else localStorage.removeItem('ht_year');
  }, []);

  const value = {
    toasts,
    toast,
    dismissToast,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed((c) => !c),
    mobileSidebarOpen,
    setMobileSidebarOpen,
    selectedYearId,
    setSelectedYearId,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
