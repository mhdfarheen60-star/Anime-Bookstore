import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

// ---- Media queries ---------------------------------------------------------

// One stable subscribe function per query, so useSyncExternalStore doesn't
// unsubscribe and resubscribe the listener on every render of every consumer.
const subscribers = new Map()
const subscribeTo = (query) => {
  if (!subscribers.has(query)) {
    subscribers.set(query, (callback) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', callback)
      return () => mql.removeEventListener('change', callback)
    })
  }
  return subscribers.get(query)
}

const useMediaQuery = (query) =>
  useSyncExternalStore(subscribeTo(query), () => window.matchMedia(query).matches, () => false)

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')

/** True on devices with a mouse/trackpad. Pointer effects are skipped on touch. */
export const useFinePointer = () => useMediaQuery('(hover: hover) and (pointer: fine)')

// ---- Shared IntersectionObserver pool -------------------------------------
// One observer per (rootMargin, threshold) pair, however many elements use it.

const pools = new Map()

export const observe = (element, callback, rootMargin, threshold) => {
  const key = `${rootMargin}|${threshold}`
  let pool = pools.get(key)
  if (!pool) {
    const callbacks = new Map()
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => callbacks.get(entry.target)?.(entry)),
      { rootMargin, threshold },
    )
    pool = { observer, callbacks }
    pools.set(key, pool)
  }
  pool.callbacks.set(element, callback)
  pool.observer.observe(element)

  // Safe to call twice (once on intersect, again on unmount): the second call
  // is a no-op, and it never deletes a newer pool that reused the same key.
  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    pool.callbacks.delete(element)
    pool.observer.unobserve(element)
    if (pool.callbacks.size === 0) {
      pool.observer.disconnect()
      if (pools.get(key) === pool) pools.delete(key)
    }
  }
}

const supportsObserver = () => typeof window !== 'undefined' && 'IntersectionObserver' in window

/**
 * Returns [ref, inView]. With `once` (the default) it stops observing after the
 * first time the element enters the viewport, so reveals don't replay.
 */
export function useInView({ once = true, rootMargin = '0px 0px -10% 0px', threshold = 0 } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(() => !supportsObserver())

  useEffect(() => {
    const element = ref.current
    if (!element || !supportsObserver()) return undefined
    // IntersectionObserver callbacks are async, so `stop` is assigned before use.
    const stop = observe(element, (entry) => {
      if (entry.isIntersecting) {
        setInView(true)
        if (once) stop()
      } else if (!once) {
        setInView(false)
      }
    }, rootMargin, threshold)
    return () => stop()
  }, [once, rootMargin, threshold])

  return [ref, inView]
}

// ---- Pointer position as CSS variables ---------------------------------------

/**
 * Writes the pointer position over the element to two CSS variables (-1..1).
 * Fine pointers only, never with reduced motion, no React state, at most one
 * write per frame; resets to 0 when the pointer leaves. Returns the ref to attach.
 */
export function usePointerVars(xVar, yVar) {
  const ref = useRef(null)
  const fine = useFinePointer()
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || !fine || reduced) return undefined
    let frame = 0
    let x = 0
    let y = 0
    const write = () => {
      frame = 0
      el.style.setProperty(xVar, x.toFixed(3))
      el.style.setProperty(yVar, y.toFixed(3))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(write)
    }
    const onMove = (event) => {
      const rect = el.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      y = ((event.clientY - rect.top) / rect.height) * 2 - 1
      schedule()
    }
    const onLeave = () => {
      x = 0
      y = 0
      schedule()
    }
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(frame)
      el.style.removeProperty(xVar)
      el.style.removeProperty(yVar)
    }
  }, [fine, reduced, xVar, yVar])

  return ref
}

/** Card tilt toward the pointer: writes --tx/--ty for .card-tilt. */
export const usePointerTilt = () => usePointerVars('--tx', '--ty')
