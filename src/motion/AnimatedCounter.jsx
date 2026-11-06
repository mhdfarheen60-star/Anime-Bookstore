import { useLayoutEffect, useRef } from 'react'
import { useInView, useReducedMotion } from './hooks'

/**
 * Counts up to a real number the first time it scrolls into view. Only for
 * meaningful catalogue figures, never invented statistics. Screen readers get
 * the final value straight away. Non-numeric input renders as-is.
 */
function AnimatedCounter({ value, duration = 1400, className = '' }) {
  const [ref, inView] = useInView()
  const reduced = useReducedMotion()
  const textRef = useRef(null)
  const target = Number(value)
  const isNumeric = Number.isFinite(target)

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return undefined
    if (!isNumeric) {
      el.textContent = String(value ?? '')
      return undefined
    }
    if (!inView || reduced) {
      el.textContent = reduced ? String(Math.round(target)) : '0'
      return undefined
    }
    let frame = 0
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 4
      el.textContent = String(Math.round(target * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, reduced, target, duration, value, isNumeric])

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      <span ref={textRef} aria-hidden="true">{isNumeric ? Math.round(target) : value}</span>
      <span className="sr-only">{value}</span>
    </span>
  )
}

export default AnimatedCounter
