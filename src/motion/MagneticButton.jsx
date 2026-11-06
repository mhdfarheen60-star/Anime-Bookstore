import { useEffect, useRef } from 'react'
import { useFinePointer, useReducedMotion } from './hooks'

/**
 * Wraps a primary call to action so it leans a few pixels toward the pointer.
 * Use sparingly (hero and final CTA only). Renders `as` (e.g. Link or 'button')
 * and passes all other props through, so it behaves exactly like the element
 * it wraps for keyboard and touch users.
 */
function MagneticButton({ as: Tag = 'button', strength = 0.22, max = 10, className = '', children, ...rest }) {
  const ref = useRef(null)
  const fine = useFinePointer()
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || !fine || reduced) return undefined
    let frame = 0
    let tx = 0
    let ty = 0
    const write = () => {
      frame = 0
      el.style.transform = tx || ty ? `translate3d(${tx}px, ${ty}px, 0)` : ''
    }
    const onMove = (event) => {
      const rect = el.getBoundingClientRect()
      const clamp = (v) => Math.max(-max, Math.min(max, v))
      tx = clamp((event.clientX - (rect.left + rect.width / 2)) * strength)
      ty = clamp((event.clientY - (rect.top + rect.height / 2)) * strength)
      if (!frame) frame = requestAnimationFrame(write)
    }
    const onLeave = () => {
      tx = 0
      ty = 0
      if (!frame) frame = requestAnimationFrame(write)
    }
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(frame)
      el.style.transform = ''
    }
  }, [fine, reduced, strength, max])

  return (
    <Tag ref={ref} className={`transition-transform duration-500 ease-(--ease-cinema) ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export default MagneticButton
