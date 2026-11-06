import { useState } from 'react'
import { coverOf, coverSrcSet } from '../../utils/coverUrl'

const DEFAULT_COLORS = ['#3b2a20', '#8a3b2b']

// Neutral stand-in used when a book has no cover or its image fails to load.
// It's drawn from the book's own title and colours, never another book's image.
function PlaceholderCover({ book, className }) {
  const [a, b] = book.colors?.length >= 2 ? book.colors : DEFAULT_COLORS
  return (
    <div role="img" aria-label={`${book.title} – cover image not available`} style={{ background: `linear-gradient(155deg, ${a}, ${b})` }}
      className={`relative aspect-2/3 w-full overflow-hidden text-white ${className}`}>
      <span aria-hidden="true" className="absolute -top-4 -right-3 font-jp text-[8rem] leading-none font-extrabold text-white/25 select-none">{book.glyph || '书'}</span>
      <div className="absolute inset-y-0 left-0 w-2 bg-black/25" />
      <span className="absolute top-2 left-4 rounded bg-black/35 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white/80 uppercase">No cover image</span>
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent p-4 pt-14">
        <p className="line-clamp-3 font-display text-base leading-tight font-bold">{book.title}</p>
        <p className="mt-1 line-clamp-1 text-xs text-white/70">{book.author}</p>
      </div>
    </div>
  )
}

// Keyed by src in BookCover, so a new image always starts from a clean state and
// a failed image can never retry in a loop.
function CoverImage({ src, book, eager, sizes, className }) {
  const [status, setStatus] = useState('loading') // loading | loaded | failed

  if (status === 'failed') return <PlaceholderCover book={book} className={className} />

  return (
    <div className={`relative aspect-2/3 w-full overflow-hidden bg-surface ${className}`}>
      {status === 'loading' && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-line/70" />}
      <img
        src={src}
        srcSet={coverSrcSet(src)}
        sizes={sizes}
        alt={`Cover of ${book.title}`}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('failed')}
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}

// Fixed 2:3 frame so cards line up whatever the image's real proportions; the
// cover itself is letterboxed with object-contain, never cropped or stretched.
// sizes: how wide the cover renders, so the browser can pick the lighter file
// for small cards (only used for catalogue covers that come in several sizes).
function BookCover({ book, eager = false, sizes = '(min-width: 1024px) 22vw, 45vw', className = '' }) {
  const src = coverOf(book)
  if (!src) return <PlaceholderCover book={book} className={className} />
  return <CoverImage key={src} src={src} book={book} eager={eager} sizes={sizes} className={className} />
}

export default BookCover
