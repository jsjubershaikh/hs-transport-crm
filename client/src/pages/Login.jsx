import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck, ArrowLeft } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';

const DEMO = [
  { role: 'Super Admin', username: 'admin', password: 'admin123' },
  { role: 'Sub Admin 1', username: 'route1admin', password: 'pass123' },
];

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Please enter both username and password');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}! 👋`, 5000);
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setError(err.normalizedMessage || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (d) => setForm({ username: d.username, password: d.password });

  return (
    <AuthLayout>
      <div className="card p-7">
        <div className="mb-6">
          <Link to="/" className="mb-4 flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-primary">
            <ArrowLeft size={16} /> Back to home
          </Link>
          <div className="text-center">
            <h1 className="font-heading text-2xl font-bold text-text-primary">Admin Login</h1>
            <p className="mt-1 text-sm text-text-secondary">Sign in to manage your transport CRM</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className={error ? 'animate-shake' : ''} noValidate>
          <div className="mb-4">
            <label className="label" htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={form.username}
              onChange={onChange}
              className={`input ${error ? 'input-error' : ''}`}
              placeholder="Enter username"
            />
          </div>

          <div className="mb-2">
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={onChange}
                className={`input pr-10 ${error ? 'input-error' : ''}`}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="field-error mb-2">{error}</p>}

          <button type="submit" className="btn btn-primary btn-lg mt-4 w-full" disabled={submitting}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-6 rounded-xl border border-dashed border-border bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
            <ShieldCheck size={14} /> Demo Credentials — click to fill
          </div>
          <div className="space-y-2">
            {DEMO.map((d) => (
              <button
                key={d.username}
                onClick={() => fillDemo(d)}
                className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-sm transition hover:bg-primary/5"
              >
                <span className="font-medium text-text-primary">{d.role}</span>
                <span className="font-mono text-xs text-text-secondary">
                  {d.username} / {d.password}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
