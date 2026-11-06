import { useEffect, useRef, useState } from 'react'

/**
 * Runs an async loader and exposes { data, loading, error, reload }.
 *
 * `fn` is kept in a ref so callers can pass an inline arrow without the effect
 * re-firing every render, while `deps` still controls *when* it reloads. A
 * request counter guarantees that a slow earlier request can never overwrite
 * the result of a newer one.
 */
export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fnRef = useRef(fn)
  const requestId = useRef(0)
  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  // Serialise deps so array identity does not re-trigger the effect.
  const depKey = JSON.stringify(deps)

  // Bumped by the effect to request a fresh load; also incremented by reload().
  const [nonce, setNonce] = useState(0)

  const reload = () => setNonce((n) => n + 1)

  // Data fetch on mount and whenever deps/nonce change.
  useEffect(() => {
    const id = ++requestId.current
    setLoading(true)
    setError('')
    fnRef.current()
      .then((result) => {
        if (requestId.current !== id) return // a newer request already settled
        setData(result)
      })
      .catch((err) => {
        if (requestId.current !== id) return
        setError(err?.message || 'Something went wrong')
      })
      .finally(() => {
        if (requestId.current !== id) return
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, nonce])

  return { data, loading, error, reload }
}

export default useAsync
