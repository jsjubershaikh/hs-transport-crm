import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, LogIn, ArrowLeft, ShieldCheck } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUI } from '../context/UIContext.jsx';



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



  return (
    <AuthLayout>
      <div className="card p-7 shadow-lift sm:p-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-primary">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <div className="mb-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck size={13} /> Secure admin access
          </span>
          <h1 className="mt-4 font-heading text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">Sign in to manage your transport CRM.</p>
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

          <button type="submit" className="btn btn-primary btn-lg mt-5 w-full" disabled={submitting}>
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-secondary">
          Credentials are provided by your administrator.
        </p>
      </div>
    </AuthLayout>
  );
}
