import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/**
 * Accessible modal: closes on Esc and backdrop click, traps scroll, animates in.
 *
 * <Modal open={open} onClose={..} title="..." size="md" footer={<.../>}>...</Modal>
 */
export default function Modal({ open, onClose, title, children, footer, size = 'md', closeOnBackdrop = true }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 no-print">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[4px] animate-fade-in"
        onClick={() => closeOnBackdrop && onClose?.()}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${SIZES[size]} max-h-[90vh] overflow-hidden rounded-modal bg-white shadow-modal animate-scale-in flex flex-col`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-heading text-lg font-bold text-text-primary">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border bg-slate-50/60 px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
