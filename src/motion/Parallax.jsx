import { useEffect } from 'react'
import { observe, usePointerVars, useReducedMotion } from './hooks'

/**
 * Pointer-driven parallax for a hero. The scene writes the pointer position to
 * two CSS variables (--px, --py in the range -1..1); each <ParallaxLayer> turns
 * them into a small translate based on its depth. It also writes its scroll
 * progress to --sy for <ScrollLayer>. No React re-renders happen
 * while the pointer moves, at most one write per animation frame, and the
 * effect is skipped entirely on touch devices and with reduced motion.
 */
export function ParallaxScene({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = usePointerVars('--px', '--py')
  const reduced = useReducedMotion()

  // Scroll progress for <ScrollLayer>: --sy goes 0 -> 1 as the scene scrolls up
  // out of view. Works on touch too (it follows the scroll, never hijacks it);
  // only listens while the scene is on screen, one write per frame at most, and
  // recomputes on resize so the offsets match the new layout.
  useEffect(() => {
    const scene = ref.current
    if (!scene || reduced || !('IntersectionObserver' in window)) return undefined

    let frame = 0
    const write = () => {
      frame = 0
      const rect = scene.getBoundingClientRect()
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)))
      scene.style.setProperty('--sy', progress.toFixed(4))
    }
    const update = () => {
      if (!frame) frame = requestAnimationFrame(write)
    }
    const listen = (on) => {
      const method = on ? 'addEventListener' : 'removeEventListener'
      window[method]('scroll', update, { passive: true })
      window[method]('resize', update, { passive: true })
    }
    const stop = observe(scene, (entry) => {
      listen(entry.isIntersecting)
      if (entry.isIntersecting) update()
    }, '0px', 0)
    return () => {
      stop()
      listen(false)
      cancelAnimationFrame(frame)
      scene.style.removeProperty('--sy')
    }
  }, [ref, reduced])

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  )
}

/**
 * Scroll-linked drift inside a ParallaxScene. depth: pixels moved by the time
 * the scene has scrolled fully out of view (positive = moves down, i.e. lags).
 */
export function ScrollLayer({ depth = 60, className = '', style, children, ...rest }) {
  return (
    <div className={`scroll-layer ${className}`} style={{ ...style, '--sdepth': depth }} {...rest}>
      {children}
    </div>
  )
}

/** depth: pixels moved at the edge of the scene. Negative values move against the pointer. */
export function ParallaxLayer({ depth = 10, className = '', style, children, ...rest }) {
  return (
    <div className={`parallax-layer ${className}`} style={{ ...style, '--depth': depth }} {...rest}>
      {children}
    </div>
  )
}
