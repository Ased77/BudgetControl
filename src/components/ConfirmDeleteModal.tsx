import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface ConfirmDeleteModalProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for destructive delete actions. The parent renders it
 * only while a delete is pending (see `useConfirmDelete`); styling follows the
 * app's standard modals with a rose destructive accent.
 */
export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  message,
  confirmLabel = 'تأیید حذف',
  cancelLabel = 'انصراف',
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape and outside click dismiss the dialog, matching the app's modals.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);
  useOutsideClick(dialogRef, onCancel);

  return (
    <div id="confirm-delete-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        ref={dialogRef}
        id="confirm-delete-modal-2"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-modal-title"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        <div id="confirm-delete-modal-3" className="flex items-center gap-3">
          <div id="confirm-delete-modal-4" className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 id="confirm-delete-modal-title" className="font-black text-sm text-slate-900 dark:text-slate-100">
            تأیید حذف
          </h3>
        </div>

        <p id="confirm-delete-modal-5" className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-4">
          {message}
        </p>

        <div id="confirm-delete-modal-6" className="flex items-center justify-end gap-2.5 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/25 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

interface PendingDelete {
  message: string;
  onConfirm: () => void;
}

/**
 * Small state hook so every view gets the same one-step confirm flow:
 * call `confirmDelete(message, action)` from a delete button, then render the
 * returned `modal` at the component root while a delete is pending.
 */
export const useConfirmDelete = () => {
  const [pending, setPending] = useState<PendingDelete | null>(null);

  const confirmDelete = (message: string, onConfirm: () => void) => {
    setPending({ message, onConfirm });
  };

  const modal = pending ? (
    <ConfirmDeleteModal
      message={pending.message}
      onConfirm={() => {
        const run = pending.onConfirm;
        setPending(null);
        run();
      }}
      onCancel={() => setPending(null)}
    />
  ) : null;

  return { confirmDelete, modal };
};
