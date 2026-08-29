import Modal from './Modal'

/**
 * A custom stand-in for window.confirm(). Native confirm()/alert()/prompt()
 * are silently suppressed in a sandboxed iframe without the `allow-modals`
 * permission — which is exactly how this app runs when published as an
 * Artifact — so relying on them means "Remove"/"Delete" buttons quietly do
 * nothing there. This renders entirely in-app instead, so it works
 * regardless of embedding context.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="flex justify-end gap-2 mt-4">
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
