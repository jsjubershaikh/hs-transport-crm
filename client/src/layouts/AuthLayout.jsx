import { Link } from 'react-router-dom';
import { Bus } from 'lucide-react';

/** Centered card on a navy mesh background — used by the Login page. */
export default function AuthLayout({ children }) {
  return (
    <div className="mesh-bg flex min-h-screen flex-col items-center justify-center p-4">
      <Link to="/" className="mb-6 flex items-center gap-2.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-accent backdrop-blur">
          <Bus size={24} />
        </span>
        <span className="font-heading text-xl font-extrabold tracking-tight text-white">HS School Bus</span>
      </Link>
      <div className="w-full max-w-md animate-scale-in">{children}</div>
      <p className="mt-6 text-xs text-white/50">© 2025 HS School Bus</p>
    </div>
  );
}
