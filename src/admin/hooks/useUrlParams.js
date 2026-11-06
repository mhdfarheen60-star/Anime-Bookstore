import { useCallback, useEffect, useState } from 'react'

/**
 * Sync list-filter state with the URL query string so views are shareable,
 * bookmarkable and survive a refresh.
 *
 * `defaults` maps param name -> default value (empty string / 'all' / 1 are
 * omitted from the URL). `resetKeys` are the filter params that bounce the
 * view back to page 1 when they change. `defaults` must be a module-level
 * constant so identities are stable across renders.
 *
 * Filter changes are NOT debounced here – callers should debounce the search
 * input themselves (see useDebouncedSearch).
 */
export function useUrlParams(defaults, resetKeys = []) {
  const read = useCallback(
    (search) => {
      const p = new URLSearchParams(search)
      const next = { ...defaults }
      for (const key of Object.keys(defaults)) {
        if (key === 'page') continue
        const raw = p.get(key)
        if (raw !== null && raw !== '') next[key] = raw
      }
      const page = Number(p.get('page') ?? 1)
      next.page = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
      return next
    },
    [defaults],
  )

  const [params, setParams] = useState(() => read(window.location.search))

  useEffect(() => {
    const onPop = () => setParams(read(window.location.search))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [read])

  // Merge a patch into the URL state. Any resetKey change (without an explicit
  // page in the patch) sends the view back to page 1.
  const update = useCallback(
    (patch) => {
      setParams((prev) => {
        const next = { ...prev, ...patch }
        if (resetKeys.some((key) => patch[key] !== undefined) && patch.page === undefined) {
          next.page = 1
        }
        const p = new URLSearchParams()
        for (const key of Object.keys(defaults)) {
          if (key === 'page') continue
          const value = next[key]
          if (value && value !== defaults[key]) p.set(key, value)
        }
        if (next.page > 1) p.set('page', String(next.page))
        const qs = p.toString()
        window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
        return next
      })
    },
    [defaults, resetKeys],
  )

  return [params, update]
}

export default useUrlParams
