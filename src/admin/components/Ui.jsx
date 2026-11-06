import { useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSpinner,
  faTriangleExclamation,
  faInbox,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'

// ---- Small presentational primitives shared by every admin module ----

export function Spinner({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500" role="status">
      <FontAwesomeIcon icon={faSpinner} spinPulse className="text-lg" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function EmptyState({ title = 'Nothing here yet', hint = '', action = null }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <FontAwesomeIcon icon={faInbox} className="text-3xl text-slate-500" />
      <p className="font-semibold text-slate-700">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center" role="alert">
      <FontAwesomeIcon icon={faTriangleExclamation} className="text-3xl text-red-600" />
      <p className="font-semibold text-slate-700">{message || 'Could not load this data'}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Try again
        </button>
      )}
    </div>
  )
}

/** Inline banner for the outcome of a mutation. */
export function Alert({ tone = 'success', message, onDismiss }) {
  if (!message) return null
  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  }
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-4 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}
    >
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      )}
    </div>
  )
}

const STATUS_TONES = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 ring-blue-200',
  processing: 'bg-purple-50 text-purple-700 ring-purple-200',
  shipped: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-red-50 text-red-700 ring-red-200',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  failed: 'bg-red-50 text-red-700 ring-red-200',
  refunded: 'bg-slate-100 text-slate-600 ring-slate-200',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  admin: 'bg-purple-50 text-purple-700 ring-purple-200',
  customer: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export function StatusBadge({ value }) {
  const tone = STATUS_TONES[String(value).toLowerCase()] || 'bg-slate-100 text-slate-600 ring-slate-200'
  const label = String(value).charAt(0).toUpperCase() + String(value).slice(1)
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {label}
    </span>
  )
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-5 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  )
}

const BTN = {
  primary: 'bg-[#3B82F6] text-white hover:bg-[#2563EB]',
  ghost: 'border border-slate-200 text-slate-600 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

export function Button({ variant = 'primary', busy = false, className = '', children, ...props }) {
  return (
    <button
      type="button"
      disabled={busy || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${className}`}
      {...props}
    >
      {busy && <FontAwesomeIcon icon={faSpinner} spinPulse />}
      {children}
    </button>
  )
}

/** Centered modal used for every create/edit form and delete confirmation. */
export function Modal({ title, onClose, children, wide = false }) {
  // Close on Escape and lock body scroll while the modal is open.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`surface-light w-full rounded-2xl bg-white text-slate-900 shadow-xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

/** Confirmation dialog for destructive actions. */
export function ConfirmDialog({ title, message, confirmLabel = 'Delete', busy = false, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm leading-relaxed text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" busy={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}


export const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[#3B82F6] focus:ring-4 focus:ring-[#3B82F6]/15 disabled:bg-slate-50 disabled:text-slate-500'

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  )
}

export function Table({ head, children }) {
  return (
    <div className="surface-light overflow-x-auto rounded-2xl border border-slate-200 bg-white text-slate-900">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 text-[11px] font-bold tracking-wide text-slate-600 uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  )
}

export function Toolbar({ children }) {
  return <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">{children}</div>
}

