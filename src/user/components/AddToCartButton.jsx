import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useCart } from '../../context/useCart'
import { useToast } from '../../context/useToast'

/**
 * Adds a book to the cart and animates through idle -> adding -> added.
 * "Added" is only shown after the server accepted the item; the price is
 * always taken by the server, never sent from here.
 */
function AddToCartButton({ book, quantity = 1, className = '', compact = false }) {
  const { isAuthenticated } = useAuth()
  const { addToCart } = useCart()
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState('idle') // idle | adding | added
  const timer = useRef(0)

  useEffect(() => () => clearTimeout(timer.current), [])

  const soldOut = (book.stock ?? 0) <= 0

  const onClick = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    if (state === 'adding') return
    setState('adding')
    const result = await addToCart(book._id, quantity)
    if (!result.success) {
      setState('idle')
      notify(result.message || 'Could not add this book to your cart.', { tone: 'error' })
      return
    }
    setState('added')
    notify(`${quantity > 1 ? `${quantity} × ` : ''}“${book.title}” added to your cart`, {
      action: { label: 'View cart', to: '/cart' },
    })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2200)
  }

  const label = soldOut ? 'Out of stock' : state === 'adding' ? 'Adding…' : state === 'added' ? 'Added' : 'Add to cart'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={soldOut || state === 'adding'}
      className={`group relative inline-flex min-h-12 items-center justify-center gap-3 overflow-hidden bg-sakura font-semibold text-white transition-[background-color,transform] duration-300 hover:bg-[#2563EB] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-line disabled:text-mist ${
        compact ? 'px-5 text-sm' : 'px-8'
      } ${className}`}
    >
      {state === 'adding' && (
        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      )}
      {state === 'added' && (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="animate-pop h-4 w-4">
          <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span>{label}</span>
    </button>
  )
}

export default AddToCartButton
