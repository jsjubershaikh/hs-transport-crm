import { Inbox } from 'lucide-react';

/** Friendly empty state with an icon, message and optional CTA. */
export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={30} />
      </div>
      <h3 className="font-heading text-base font-semibold text-text-primary">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-text-secondary">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
