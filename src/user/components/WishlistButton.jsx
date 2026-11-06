import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWishlist } from '../../context/useWishlist'
import { useToast } from '../../context/useToast'

function Heart({ filled }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Save/unsave a book. The heart only fills after the server confirms; while a
 * request is in flight the button is disabled, so double clicks can't race.
 */
function WishlistButton({ book, className = '', withLabel = false }) {
  const { has, toggle, pending } = useWishlist()
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [burst, setBurst] = useState(0)

  const bookId = book._id
  if (!bookId) return null
  const saved = has(bookId)
  const busy = pending.has(bookId)

  const onClick = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    const result = await toggle(bookId)
    if (result.needsAuth) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    if (result.busy) return
    if (!result.ok) {
      notify(result.message, { tone: 'error' })
      return
    }
    if (result.added) setBurst((n) => n + 1)
    notify(result.added ? `Saved “${book.title}”` : `Removed “${book.title}”`, {
      action: result.added ? { label: 'Wishlist', to: '/wishlist' } : undefined,
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${book.title} from wishlist` : `Save ${book.title} to wishlist`}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 transition-colors duration-300 ${
        saved ? 'text-electric' : 'text-moon/80 hover:text-moon'
      } ${busy ? 'is-pending' : ''} ${className}`}
    >
      <span key={burst} className={burst ? 'animate-heart' : ''}>
        <Heart filled={saved} />
      </span>
      {withLabel && <span className="text-sm font-semibold">{saved ? 'Saved' : 'Save'}</span>}
    </button>
  )
}

export default WishlistButton
