interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Simple modal confirm — reuses the equipment editor backdrop styling. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Annuler',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="equipment-editor-backdrop confirm-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={onCancel}
    >
      <div
        className="equipment-editor card confirm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="equipment-editor-head">
          <h2 id="confirm-dialog-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="Fermer">
            ✕
          </button>
        </div>
        <p id="confirm-dialog-desc" className="confirm-dialog-message">
          {message}
        </p>
        <div className="confirm-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
