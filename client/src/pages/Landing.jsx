import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Wallet, Route as RouteIcon, MessageCircle, CalendarRange, ShieldCheck, FileText,
  ArrowRight, Star, MapPin, Phone, Mail, Menu, X, CheckCircle2, Bus,
  UserPlus, CreditCard, Send, Sparkles,
} from 'lucide-react';

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

const STEPS = [
  { icon: UserPlus, title: 'Add Students & Routes', desc: 'Set up routes, buses and student records in minutes — fees auto-generate per month.' },
  { icon: CreditCard, title: 'Collect & Track Fees', desc: 'Record payments, generate receipts and watch dues update across every route live.' },
  { icon: Send, title: 'Share & Reconcile', desc: 'Send receipts on WhatsApp and verify daily collections with one clean dashboard.' },
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

  const NAV = [
    { href: '#top', label: 'Home' },
    { href: '#features', label: 'Features' },
    { href: '#how', label: 'How it works' },
    { href: '#contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* ───────── Header ───────── */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-white/75 shadow-[0_1px_20px_-12px_rgba(11,31,75,0.25)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-2.5">
          {/* Logo */}
          <a href="#top" className="group flex items-center gap-2.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white ring-1 ring-border/70 transition-shadow group-hover:shadow-card">
              <img src="/logo.png" alt="HS School Bus" className="h-10 w-10 object-contain" />
            </span>
            <span className="font-heading text-lg font-extrabold tracking-tight text-primary">HS School Bus</span>
          </a>

          {/* Center pill nav */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-border/70 bg-white/70 p-1 shadow-sm backdrop-blur md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-full px-4 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-primary/5 hover:text-primary"
              >
                {n.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:block">
            <Link to="/login" className="btn btn-secondary btn-md shadow-sm">
              Admin Login <ArrowRight size={16} />
            </Link>
          </div>

          <button className="text-primary md:hidden" onClick={() => setMenuOpen((m) => !m)} aria-label="Menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-border bg-white px-5 py-3 md:hidden">
            <div className="flex flex-col gap-1" onClick={() => setMenuOpen(false)}>
              {NAV.map((n) => (
                <a key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-primary/5 hover:text-primary">
                  {n.label}
                </a>
              ))}
              <Link to="/login" className="btn btn-secondary btn-md mt-2">Admin Login</Link>
            </div>
          </div>
        )}
      </header>

      {/* ───────── Hero ───────── */}
      <section id="top" className="relative overflow-hidden">
        {/* decorative backdrop */}
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-24 top-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-12 pt-8 lg:grid-cols-2 lg:pb-16 lg:pt-12">
          <div className="animate-fade-slide-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3.5 py-1.5 text-xs font-semibold text-accent">
              <Sparkles size={13} /> Trusted by modern schools
            </span>
            <h1 className="mt-6 font-heading text-4xl font-extrabold leading-[1.08] tracking-tight text-primary sm:text-5xl lg:text-6xl">
              Smart School Bus<br />
              Management,{' '}
              <span className="text-gradient">Simplified</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-text-secondary">
              Real-time tracking, fee collection, and route control — a complete transport CRM built for schools, all in one elegant place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="btn btn-secondary btn-lg shadow-cardHover">
                Admin Login <ArrowRight size={18} />
              </Link>
              <a href="#features" className="btn btn-outline btn-lg">Explore Features</a>
            </div>

            {/* trust row */}
            <div className="mt-7 flex items-center gap-4 text-sm text-text-secondary">
              <div className="flex -space-x-2">
                {['bg-primary', 'bg-accent', 'bg-primary-light'].map((c, i) => (
                  <span key={i} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white ${c}`}>
                    {['H', 'S', 'B'][i]}
                  </span>
                ))}
              </div>
              <span className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-accent text-accent" />)}
                <span className="ml-1 font-medium text-text-primary">Loved by administrators</span>
              </span>
            </div>

            <div className="mt-10 grid max-w-lg grid-cols-2 gap-6 border-t border-border pt-8 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="font-heading text-2xl font-extrabold text-primary">{s.value}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Floating dashboard mockup */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-6 rounded-[2rem] bg-gradient-to-tr from-primary/15 to-accent/15 blur-2xl" />
            <div className="animate-float-slow relative rounded-2xl border border-border bg-white p-5 shadow-lift">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="HS School Bus" className="h-8 w-8 rounded-md object-contain" />
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
            {/* floating notification card */}
            <div className="animate-float absolute -bottom-6 -left-6 rounded-xl border border-border bg-white p-3.5 shadow-card" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success"><Wallet size={16} /></span>
                <div>
                  <p className="text-[11px] text-text-secondary">Payment received</p>
                  <p className="font-heading text-sm font-bold text-success">+ ₹1,500</p>
                </div>
              </div>
            </div>
            {/* floating route card */}
            <div className="animate-float absolute -right-5 -top-5 rounded-xl border border-border bg-white p-3.5 shadow-card" style={{ animationDelay: '2s' }}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent"><Bus size={16} /></span>
                <div>
                  <p className="text-[11px] text-text-secondary">Route 4 · On time</p>
                  <p className="font-heading text-sm font-bold text-primary">38 students</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-14 lg:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Features</span>
          <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
            Everything you need to run transport
          </h2>
          <p className="mt-3 text-text-secondary">A complete, thoughtfully-designed toolkit built for school bus operations.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border/70 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lift"
            >
              {/* soft corner accent that grows on hover */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/5 transition-transform duration-500 group-hover:scale-[2.2]" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light text-white shadow-card transition-transform duration-300 group-hover:scale-110">
                <f.icon size={22} />
              </div>
              <h3 className="relative mt-5 font-heading text-lg font-bold text-text-primary">{f.title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-text-secondary">{f.desc}</p>
              <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent opacity-0 transition-all duration-300 group-hover:opacity-100">
                Learn more <ArrowRight size={14} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <section id="how" className="border-y border-border/60 bg-white py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">How it works</span>
            <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
              Up and running in three steps
            </h2>
            <p className="mt-3 text-text-secondary">From setup to reconciliation — a simple, guided flow.</p>
          </div>
          <div className="relative mt-12 grid gap-6 md:grid-cols-3">
            {/* connecting line (desktop) */}
            <div className="absolute left-[16%] right-[16%] top-9 hidden border-t-2 border-dashed border-border md:block" />
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="group relative rounded-2xl border border-border/70 bg-white p-7 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lift"
              >
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light text-white shadow-card transition-transform duration-300 group-hover:scale-105">
                  <s.icon size={26} />
                  <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-extrabold text-white ring-4 ring-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 font-heading text-lg font-bold text-text-primary">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-text-secondary">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA band ───────── */}
      <section className="mx-auto max-w-7xl px-5 py-14 lg:py-16">
        <div className="mesh-bg relative overflow-hidden rounded-3xl px-8 py-12 text-center shadow-lift sm:px-16">
          <div className="absolute inset-0 bg-grid-dark opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <div className="relative">
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to streamline your transport?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              Manage students, fees, routes and receipts from one professional dashboard — built for the way your school actually works.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/login" className="btn btn-primary btn-lg shadow-cardHover">
                Get Started <ArrowRight size={18} />
              </Link>
              <a href="#contact" className="btn btn-lg border-[1.5px] border-white/40 bg-white/5 text-white hover:bg-white/15">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Contact ───────── */}
      <section id="contact" className="bg-bg py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Contact</span>
            <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">Get in touch</h2>
            <p className="mt-3 text-text-secondary">Have questions? We'd love to help you get started.</p>
          </div>

          <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-3xl border border-border/70 bg-white shadow-lift lg:grid lg:grid-cols-5">
            {/* Info panel */}
            <div className="relative overflow-hidden mesh-bg p-8 text-white lg:col-span-2 lg:p-10">
              <div className="absolute inset-0 bg-grid-dark opacity-50 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
              <div className="absolute -bottom-16 -right-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative">
                <h3 className="font-heading text-2xl font-bold">Contact information</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">Reach out anytime — we usually respond within a day.</p>

                <div className="mt-9 space-y-6">
                  <InfoRow icon={MapPin} label="Address" value="Pandit Nagar Cidco Colony, Nashik-422009" />
                  <InfoRow icon={Phone} label="Phone" value="9822920739 / 8668651801" />
                  <InfoRow icon={Mail} label="Email" value="huzaifatransportation@gmail.com" />
                </div>

                <div className="mt-10 flex flex-wrap gap-2.5">
                  {['Fast setup', 'Secure access', 'WhatsApp ready'].map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15">
                      <CheckCircle2 size={14} className="text-accent" /> {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Form */}
            <form className="space-y-4 p-8 lg:col-span-3 lg:p-10" onSubmit={handleContactSubmit}>
              <h3 className="font-heading text-xl font-bold text-text-primary">Send us a message</h3>
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
              <div>
                <label className="label">Message</label>
                <textarea
                  className="input h-32 resize-none py-2.5"
                  placeholder="How can we help?"
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full">
                <Send size={17} /> Send Message
              </button>
              <p className="text-center text-xs text-text-secondary">We’ll never share your details with anyone.</p>
            </form>
          </div>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer className="border-t border-border bg-primary py-12 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="HS School Bus" className="h-14 w-14 rounded-lg object-contain" />
              <div>
                <p className="font-heading text-lg font-bold">HS School Bus</p>
                <p className="text-xs text-white/60">Smart school bus management.</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              A complete transport CRM for schools — fees, routes, receipts and reports in one elegant dashboard.
            </p>
          </div>
          <div>
            <p className="font-heading text-sm font-bold uppercase tracking-wide text-white/80">Navigate</p>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li><a href="#top" className="hover:text-white">Home</a></li>
              <li><a href="#features" className="hover:text-white">Features</a></li>
              <li><a href="#how" className="hover:text-white">How it works</a></li>
              <li><a href="#contact" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <p className="font-heading text-sm font-bold uppercase tracking-wide text-white/80">Contact</p>
            <ul className="mt-3 space-y-2 text-sm text-white/60">
              <li>Nashik-422009</li>
              <li>9822920739</li>
              <li className="break-all">huzaifatransportation@gmail.com</li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 px-5 pt-6">
          <p className="text-center text-xs text-white/50">© 2025 HS School Bus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent ring-1 ring-white/15">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}
