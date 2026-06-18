import { Link } from 'react-router-dom';
import { ShieldCheck, Wallet, MessageCircle } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: Wallet, title: 'Real-time fee tracking', desc: 'Collections and dues update instantly across every route.' },
  { icon: MessageCircle, title: 'WhatsApp receipts', desc: 'Share professional receipts with parents in a single tap.' },
  { icon: ShieldCheck, title: 'Role-based security', desc: 'Each manager sees only what they’re meant to.' },
];

/**
 * Split-screen auth layout: a branded navy panel on the left (desktop) and the
 * form card on the right. On mobile only the form shows, with a small logo.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden mesh-bg p-12 text-white lg:flex xl:p-16">
        <div className="absolute inset-0 bg-grid-dark opacity-50 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
        <div className="absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2">
            <img src="/logo.png" alt="HS School Bus" className="h-full w-full object-contain" />
          </span>
          <span className="font-heading text-xl font-extrabold tracking-tight">HS School Bus</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="font-heading text-4xl font-extrabold leading-tight tracking-tight">
            Manage your transport with confidence.
          </h2>
          <p className="mt-4 text-white/70">
            Sign in to access fees, routes, receipts and reports — all from one professional dashboard.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent ring-1 ring-white/15">
                  <h.icon size={18} />
                </span>
                <div>
                  <p className="font-semibold">{h.title}</p>
                  <p className="text-sm text-white/60">{h.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">© 2025 HS School Bus. All rights reserved.</p>
      </div>

      {/* Form area */}
      <div className="flex w-full flex-col items-center justify-center bg-bg px-6 py-10 lg:w-1/2">
        <Link to="/" className="mb-8 flex items-center gap-3 lg:hidden">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 shadow-card">
            <img src="/logo.png" alt="HS School Bus" className="h-full w-full object-contain" />
          </span>
          <span className="font-heading text-lg font-extrabold tracking-tight text-primary">HS School Bus</span>
        </Link>
        <div className="w-full max-w-md animate-scale-in">{children}</div>
      </div>
    </div>
  );
}
