import { Loader2 } from 'lucide-react';

/** Inline / overlay spinner. */
export default function LoadingSpinner({ label, overlay = false, size = 28 }) {
  const spinner = (
    <div className="flex flex-col items-center gap-3 text-text-secondary">
      <Loader2 className="animate-spin text-accent" size={size} />
      {label && <p className="text-sm font-medium">{label}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }
  return <div className="flex items-center justify-center py-10">{spinner}</div>;
}
