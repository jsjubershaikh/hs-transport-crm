import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useUI } from '../context/UIContext.jsx';

const CONFIG = {
  success: { icon: CheckCircle2, ring: 'border-l-success', iconColor: 'text-success' },
  error: { icon: AlertCircle, ring: 'border-l-danger', iconColor: 'text-danger' },
  warning: { icon: AlertTriangle, ring: 'border-l-warning', iconColor: 'text-warning' },
  info: { icon: Info, ring: 'border-l-primary-light', iconColor: 'text-primary-light' },
};

/** Renders the global toast stack (max 3) in the top-right corner. */
export function ToastContainer() {
  const ui = useUI();
  if (!ui) return null;
  const { toasts, dismissToast } = ui;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5">
      {toasts.map((t) => {
        const cfg = CONFIG[t.type] || CONFIG.info;
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border border-border border-l-4 ${cfg.ring} bg-white p-3.5 shadow-lift animate-slide-in-right`}
          >
            <Icon className={`mt-0.5 shrink-0 ${cfg.iconColor}`} size={20} />
            <p className="flex-1 text-sm font-medium leading-snug text-text-primary">{t.message}</p>
            <button
              onClick={() => dismissToast(t.id)}
              className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
