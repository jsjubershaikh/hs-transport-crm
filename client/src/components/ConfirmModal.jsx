import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';

/**
 * Destructive-action confirmation. Calls onConfirm (may be async) and shows a
 * spinner on the confirm button until it resolves.
 */
export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
}) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm?.();
      onClose?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      size="sm"
      footer={
        <>
          <button className="btn btn-outline btn-md" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={`btn btn-md ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
          <AlertTriangle size={22} />
        </div>
        <div>
          <h3 className="font-heading text-base font-bold text-text-primary">{title}</h3>
          <p className="mt-1 text-sm text-text-secondary">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
