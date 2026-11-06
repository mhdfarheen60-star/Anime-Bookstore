import { useId, useState } from 'react'

/**
 * Disclosure section with a height transition. Collapsed content is `inert`,
 * so it can't be tabbed into or read out while hidden.
 */
function SmoothAccordion({ title, defaultOpen = false, className = '', children }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className={`border-b border-line ${className}`}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold tracking-wide text-moon"
        >
          {title}
          <span
            aria-hidden="true"
            className={`relative h-3 w-3 transition-transform duration-500 ease-(--ease-cinema) ${open ? 'rotate-45' : ''}`}
          >
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current" />
          </span>
        </button>
      </h3>
      <div id={id} role="region" className="acc-panel" data-open={open} inert={!open}>
        <div>
          <div className="pb-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default SmoothAccordion
