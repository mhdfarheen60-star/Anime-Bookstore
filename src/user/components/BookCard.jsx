import { memo } from 'react'
import { Link } from 'react-router-dom'
import { availabilityOf, formatPrice } from '../../utils/format'
import { useWishlist } from '../../context/useWishlist'
import { usePointerTilt } from '../../motion/hooks'
import BookCover from './BookCover'
import WishlistButton from './WishlistButton'

/**
 * Product card with "ProductCardMotion": on hover-capable devices the card lifts
 * a few pixels, the cover scales slightly, a thin electric border lights up and
 * series/availability fade in. On touch screens everything is simply visible.
 * The wishlist heart is a sibling of the link (no button inside an <a>).
 */
const BookCard = memo(function BookCard({ book, sizes, eager = false, className = '' }) {
  const { has } = useWishlist()
  const tiltRef = usePointerTilt()
  const availability = availabilityOf(book.stock)
  const saved = book._id && has(book._id)
  const seriesLine = book.series
    ? `${book.series}${book.volumeNumber != null ? ` · Vol. ${book.volumeNumber}` : ''}`
    : book.genre

  return (
    <article ref={tiltRef} className={`card-motion relative ${className}`}>
      <div className="card-lift rounded-xl border border-line bg-panel p-3 shadow-[0_1px_2px_rgba(17,19,24,0.05)] sm:p-4">
        <Link to={`/view/${book.id ?? book._id}/book`} className="group block">
          <div className="card-frame card-cover card-tilt overflow-hidden rounded-md border border-line/70 bg-surface shadow-[0_16px_36px_-26px_rgba(17,19,24,0.4)]">
            <BookCover book={book} sizes={sizes} eager={eager} />
          </div>
          <div className="mt-4">
            {seriesLine && <p className="card-meta eyebrow mb-2 truncate text-mist">{seriesLine}</p>}
            <div className="flex items-start justify-between gap-4">
              <h3 className="line-clamp-2 font-display text-[1.05rem] leading-snug font-semibold text-moon transition-colors duration-300 group-hover:text-electric">{book.title}</h3>
              {book.price != null && <p className="shrink-0 text-[1.05rem] font-semibold text-moon tabular-nums">{formatPrice(book.price)}</p>}
            </div>
            <p className="mt-1 truncate text-sm text-mist">{book.author}</p>
            {availability && <p className={`card-meta mt-2 text-xs font-semibold ${availability.tone}`}>{availability.label}</p>}
          </div>
        </Link>
        {book._id && (
          <WishlistButton
            book={book}
            className={`absolute top-4 right-4 rounded-full border border-line bg-panel/90 shadow-sm backdrop-blur ${saved ? '' : 'card-meta'}`}
          />
        )}
      </div>
    </article>
  )
})

export default BookCard
