import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const ToastContext = createContext(null)

// Exported for useToast.js; this file only contains the provider.
export default ToastContext

const DURATION = 3600

/** Short confirmations ("Added to cart") announced politely to screen readers. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback((message, { tone = 'success', action } = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((list) => [...list.slice(-2), { id, message, tone, action }])
    timers.current.set(id, setTimeout(() => dismiss(id), DURATION))
  }, [dismiss])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => clearTimeout(timer))
  }, [])

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-8"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`drop-in pointer-events-auto flex w-full max-w-sm items-center gap-4 border bg-panel/95 px-5 py-4 text-sm text-moon shadow-xl shadow-black/10 backdrop-blur ${
              t.tone === 'error' ? 'border-red-200' : 'border-line'
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.tone === 'error' ? 'bg-red-500' : 'bg-electric'}`}
            />
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <Link to={t.action.to} onClick={() => dismiss(t.id)} className="shrink-0 font-semibold text-electric hover:underline">
                {t.action.label}
              </Link>
            )}
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="-mr-2 grid h-8 w-8 shrink-0 place-items-center text-mist hover:text-moon">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
