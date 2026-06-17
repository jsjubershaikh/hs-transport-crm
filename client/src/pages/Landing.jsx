import { Link } from 'react-router-dom';
import {
  Wallet, Route as RouteIcon, MessageCircle, CalendarRange, ShieldCheck, FileText,
  ArrowRight, Star, MapPin, Phone, Mail, Menu, X,
} from 'lucide-react';
import { useState } from 'react';

const FEATURES = [
  { icon: Wallet, title: 'Real-Time Fee Tracking', desc: 'Collect, track and reconcile transport fees month by month with instant status.' },
  { icon: RouteIcon, title: 'Smart Route Management', desc: 'Organize routes, drivers and buses with live student counts and collections.' },
  { icon: MessageCircle, title: 'WhatsApp Receipts', desc: 'Share receipts and payment reminders to parents in a single tap.' },
  { icon: CalendarRange, title: 'Multi-Year Records', desc: 'Promote students each year and keep every past year archived and searchable.' },
  { icon: ShieldCheck, title: 'Role-Based Access', desc: 'Super admins see everything; route managers only their own students and fees.' },
  { icon: FileText, title: 'Instant PDF Receipts', desc: 'Professional, print-ready receipts generated the moment a payment is recorded.' },
];

const STATS = [
  { value: '100+', label: 'Students Managed' },
  { value: '4.9★', label: 'Satisfaction' },
  { value: '99.9%', label: 'Uptime' },
  { value: '5+', label: 'Routes Managed' },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    const subject = encodeURIComponent(`Inquiry from ${contactForm.name}`);
    const body = encodeURIComponent(
      `Name: ${contactForm.name}\nEmail: ${contactForm.email}\n\nMessage:\n${contactForm.message}`
    );
    window.location.href = `mailto:huzaifatransportation@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
          <a href="#top" className="flex items-center gap-2">
            <img src="/logo.png" alt="HS School Bus" className="h-10 w-auto object-contain" />
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#top" className="text-sm font-medium text-text-secondary hover:text-primary">Home</a>
            <a href="#features" className="text-sm font-medium text-text-secondary hover:text-primary">Features</a>
            <a href="#contact" className="text-sm font-medium text-text-secondary hover:text-primary">Contact</a>
            <Link to="/login" className="btn btn-secondary btn-md">Admin Login</Link>
          </nav>
          <button className="md:hidden" onClick={() => setMenuOpen((m) => !m)} aria-label="Menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-border bg-white px-5 py-3 md:hidden">
            <div className="flex flex-col gap-2">
              <a href="#features" className="py-1.5 text-sm font-medium" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#contact" className="py-1.5 text-sm font-medium" onClick={() => setMenuOpen(false)}>Contact</a>
              <Link to="/login" className="btn btn-secondary btn-md mt-1">Admin Login</Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <div className="mesh-bg absolute inset-0 opacity-[0.04]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-slide-up">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              <Star size={12} /> Trusted by modern schools
            </span>
            <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.1] tracking-tight text-primary sm:text-5xl">
              Smart School Bus<br />Management for<br />Modern Schools
            </h1>
            <p className="mt-5 max-w-md text-lg text-text-secondary">
              Real-time tracking, fee management, and route control — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="btn btn-secondary btn-lg">
                Admin Login <ArrowRight size={18} />
              </Link>
              <button className="btn btn-outline btn-lg cursor-not-allowed opacity-60" disabled>
                Student Login — Coming Soon
              </button>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-2 gap-6 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="font-heading text-2xl font-extrabold text-primary">{s.value}</p>
                  <p className="text-xs text-text-secondary">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Floating dashboard mockup */}
          <div className="relative hidden lg:block">
            <div className="animate-float rounded-2xl border border-border bg-white p-5 shadow-lift">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="HS School Bus" className="h-7 w-auto object-contain" />
                  <span className="font-heading text-sm font-bold">Dashboard</span>
                </div>
                <span className="badge badge-active">Live</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Students', v: '428', c: 'text-primary' },
                  { l: 'Collected', v: '₹6.4L', c: 'text-success' },
                  { l: 'Pending', v: '₹84k', c: 'text-danger' },
                  { l: 'Routes', v: '12', c: 'text-blue-600' },
                ].map((k) => (
                  <div key={k.l} className="rounded-xl border border-border bg-slate-50 p-3">
                    <p className="text-[11px] text-text-secondary">{k.l}</p>
                    <p className={`font-heading text-xl font-bold ${k.c}`}>{k.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex h-24 items-end gap-1.5 rounded-xl border border-border bg-slate-50 p-3">
                {[40, 65, 50, 80, 60, 90, 75, 95, 70, 85, 55].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary to-accent" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 animate-float rounded-xl border border-border bg-white p-3.5 shadow-card" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success"><Wallet size={16} /></span>
                <div>
                  <p className="text-[11px] text-text-secondary">Payment received</p>
                  <p className="font-heading text-sm font-bold text-success">+ ₹1,500</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-16 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-primary">Everything you need to run transport</h2>
          <p className="mt-3 text-text-secondary">A complete toolkit built for school bus operations.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group card card-hover border-transparent p-6 hover:border-accent/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5 text-primary transition-colors group-hover:bg-accent/10 group-hover:text-accent">
                <f.icon size={24} />
              </div>
              <h3 className="mt-4 font-heading text-lg font-bold text-text-primary">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-white py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2">
          <div>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-primary">Get in touch</h2>
            <p className="mt-3 text-text-secondary">Have questions? We'd love to help you get started.</p>
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary"><MapPin size={18} /></span><span className="text-sm text-text-secondary">Pandit Nagar Cidco Colony Nashik-422009</span></div>
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary"><Phone size={18} /></span><span className="text-sm text-text-secondary">9822920739 / 8668651801</span></div>
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary"><Mail size={18} /></span><span className="text-sm text-text-secondary">huzaifatransportation@gmail.com</span></div>
            </div>
          </div>
          <form className="card space-y-4 p-6" onSubmit={handleContactSubmit}>
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                placeholder="Your name"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea
                className="input h-28 resize-none py-2"
                placeholder="How can we help?"
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-md w-full">Send Message</button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-primary py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="HS School Bus" className="h-10 w-auto object-contain brightness-0 invert" />
            <div>
              <p className="font-heading font-bold">HS School Bus</p>
              <p className="text-xs text-white/60">Smart school bus management.</p>
            </div>
          </div>
          <p className="text-xs text-white/60">© 2025 HS School Bus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
