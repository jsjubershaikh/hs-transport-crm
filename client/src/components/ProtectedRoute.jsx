import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';

/** Gate for authenticated routes — redirects to /login if not signed in. */
export function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

/**
 * Role gate. Subadmins hitting a superadmin-only route are bounced to the
 * dashboard with a warning toast (mirrors the server-side 403).
 */
export function RequireRole({ role, children }) {
  const { user } = useAuth();
  const { toast } = useUI();
  const allowed = user?.role === role;

  useEffect(() => {
    if (!allowed) toast.warning("You don't have access to that page");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed]);

  if (!allowed) return <Navigate to="/app/dashboard" replace />;
  return children;
}
