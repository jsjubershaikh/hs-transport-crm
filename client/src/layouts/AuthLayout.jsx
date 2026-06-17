import { Link } from 'react-router-dom';

/** Centered card on a navy mesh background — used by the Login page. */
export default function AuthLayout({ children }) {
  return (
    <div className="mesh-bg flex min-h-screen flex-col items-center justify-center p-4">
      <Link to="/" className="mb-6 flex items-center gap-3">
        <img
          src="/logo.png"
          alt="HS School Bus"
          className="h-12 w-12 object-contain rounded-xl"
        />
        <span className="font-heading text-xl font-extrabold tracking-tight text-white">HS School Bus</span>
      </Link>
      <div className="w-full max-w-md animate-scale-in">{children}</div>
      <p className="mt-6 text-xs text-white/50">© 2025 HS School Bus</p>
    </div>
  );
}
