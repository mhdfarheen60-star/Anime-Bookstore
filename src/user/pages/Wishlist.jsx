import { useState } from 'react'
import { Link } from 'react-router-dom'
import { transformBooks } from '../../data/books'
import { useWishlist } from '../../context/useWishlist'
import { useToast } from '../../context/useToast'
import { formatPrice, availabilityOf } from '../../utils/format'
import { StaggeredReveal, TextReveal } from '../../motion/Reveal'
import BookCover from '../components/BookCover'
import AddToCartButton from '../components/AddToCartButton'
import { GridSkeleton } from '../components/Skeletons'

const GRID = 'grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3'
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function Wishlist() {
  const { books: rawBooks, status, toggle, refresh } = useWishlist()
  const { notify } = useToast()
  const [leaving, setLeaving] = useState(() => new Set())
  const books = transformBooks(rawBooks)

  // The card fades out first, then the request is sent; the list only drops it
  // once the server confirms. If the request fails it fades back in.
  const remove = async (book) => {
    if (leaving.has(book.id)) return
    setLeaving((s) => new Set(s).add(book.id))
    await wait(350)
    const result = await toggle(book.id)
    setLeaving((s) => {
      const next = new Set(s)
      next.delete(book.id)
      return next
    })
    if (result.ok) notify(`Removed “${book.title}”`)
    else notify(result.message || 'Could not remove this book', { tone: 'error' })
  }

  return (
    <div>
      <header className="shell pt-[clamp(3rem,8vw,7rem)] pb-[clamp(2.5rem,5vw,4rem)]">
        <p className="eyebrow text-mist"><span className="text-electric">(Saved)</span> — Your wishlist</p>
        <TextReveal as="h1" lines={['Saved for', 'later.']} className="text-headline mt-8" />
        {status === 'ready' && books.length > 0 && (
          <p className="mt-8 text-sm text-mist">{books.length} {books.length === 1 ? 'book' : 'books'}</p>
        )}
      </header>

      <section aria-label="Saved books" className="shell border-t border-line py-[clamp(3.5rem,7vw,6rem)]">
        {(status === 'loading' || status === 'idle') && <GridSkeleton count={3} className={GRID} label="Loading wishlist" />}

        {status === 'error' && (
          <div role="alert">
            <p className="text-mist">Your wishlist couldn’t be loaded.</p>
            <button type="button" onClick={refresh} className="mt-6 min-h-12 border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">Try again</button>
          </div>
        )}

        {status === 'ready' && books.length === 0 && (
          <div className="max-w-md">
            <h2 className="text-title">Nothing saved yet.</h2>
            <p className="mt-4 text-mist">Tap the heart on any book to keep it here for later.</p>
            <Link to="/all-books" className="mt-8 inline-flex min-h-12 items-center bg-sakura px-6 font-semibold text-white transition-colors hover:bg-[#2563EB]">Browse books</Link>
          </div>
        )}

        {status === 'ready' && books.length > 0 && (
          <StaggeredReveal as="ul" itemAs="li" className={GRID} step={80}>
            {books.map((book) => {
              const availability = availabilityOf(book.stock)
              return (
                <article key={book.id} className={`flex gap-6 ${leaving.has(book.id) ? 'leaving' : 'transition-opacity duration-300'}`}>
                  <Link to={`/view/${book.id}/book`} className="w-28 shrink-0 sm:w-32">
                    <BookCover book={book} sizes="128px" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    {book.series && <p className="eyebrow truncate text-mist">{book.series}{book.volumeNumber != null ? ` · Vol. ${book.volumeNumber}` : ''}</p>}
                    <Link to={`/view/${book.id}/book`} className="mt-2 line-clamp-2 font-display text-lg leading-snug font-semibold hover:text-electric">{book.title}</Link>
                    <p className="mt-1 truncate text-sm text-mist">{book.author}</p>
                    <p className="mt-3 font-semibold tabular-nums">{formatPrice(book.price)}</p>
                    {availability && <p className={`mt-1 text-xs font-semibold ${availability.tone}`}>{availability.label}</p>}
                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
                      <AddToCartButton book={book} compact />
                      <button
                        type="button"
                        onClick={() => remove(book)}
                        disabled={leaving.has(book.id)}
                        className="min-h-11 px-2 text-sm text-mist underline-offset-4 hover:text-moon hover:underline"
                      >
                        Remove <span className="sr-only">{book.title}</span>
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </StaggeredReveal>
        )}
      </section>
    </div>
  )
}

export default Wishlist
