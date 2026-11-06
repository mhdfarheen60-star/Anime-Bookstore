import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from './useAuth'

const WishlistContext = createContext(null)

// Exported for useWishlist.js; this file only contains the provider.
export default WishlistContext

const EMPTY = { ids: new Set(), books: [] }

/**
 * Wishlist state, persisted through /api/wishlist. The UI only changes after the
 * server confirms, and while a book's request is in flight further clicks on it
 * are ignored, so rapid clicking can't leave the heart out of sync.
 */
export function WishlistProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [wishlist, setWishlist] = useState(EMPTY)
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [pending, setPending] = useState(() => new Set())
  const inFlight = useRef(new Set())

  const apply = (data) => setWishlist({ ids: new Set(data.ids), books: data.books })

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist(EMPTY)
      setStatus('idle')
      return
    }
    setStatus('loading')
    try {
      const res = await api.getWishlist()
      apply(res.data.wishlist)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [isAuthenticated])

  // Load once the session is known. A data fetch, so set-state-in-effect is fine.
  useEffect(() => {
    if (!authLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch
      refresh()
    }
  }, [authLoading, refresh])

  const setBusy = (bookId, busy) => {
    if (busy) inFlight.current.add(bookId)
    else inFlight.current.delete(bookId)
    setPending(new Set(inFlight.current))
  }

  /** Returns { ok, added } or { ok: false, needsAuth } / { ok: false, message }. */
  const toggle = useCallback(async (bookId) => {
    if (!isAuthenticated) return { ok: false, needsAuth: true }
    if (inFlight.current.has(bookId)) return { ok: false, busy: true }
    const adding = !wishlist.ids.has(bookId)
    setBusy(bookId, true)
    try {
      const res = adding ? await api.addToWishlist(bookId) : await api.removeFromWishlist(bookId)
      apply(res.data.wishlist)
      return { ok: true, added: adding }
    } catch (error) {
      return { ok: false, message: error.message || 'Could not update your wishlist' }
    } finally {
      setBusy(bookId, false)
    }
  }, [isAuthenticated, wishlist.ids])

  const value = useMemo(() => ({
    ids: wishlist.ids,
    books: wishlist.books,
    count: wishlist.ids.size,
    status,
    pending,
    has: (bookId) => wishlist.ids.has(bookId),
    toggle,
    refresh,
  }), [wishlist, status, pending, toggle, refresh])

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}
