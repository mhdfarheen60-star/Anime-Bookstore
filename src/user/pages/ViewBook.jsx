import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { transformBook, transformBooks } from '../../data/books'
import { availabilityOf, formatPrice } from '../../utils/format'
import { recordView } from '../../utils/recentlyViewed'
import { api } from '../../api/client'
import { Reveal, StaggeredReveal } from '../../motion/Reveal'
import SmoothAccordion from '../../motion/SmoothAccordion'
import BookCard from '../components/BookCard'
import BookCover from '../components/BookCover'
import AddToCartButton from '../components/AddToCartButton'
import WishlistButton from '../components/WishlistButton'
import { DetailsSkeleton } from '../components/Skeletons'

// Only show the details that are actually known for this book.
const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
}

const detailRows = (book, availability) => [
  ['Series', book.series],
  ['Volume', book.volumeNumber != null ? `Vol. ${book.volumeNumber}` : ''],
  ['Author', book.author],
  ['Illustrator', book.illustrator],
  ['Publisher', book.publisher],
  ['ISBN', book.isbn],
  ['Language', book.language],
  ['Edition', book.edition],
  ['Format', book.format],
  ['Pages', book.pages ? `${book.pages} pages` : ''],
  ['Publication date', formatDate(book.publicationDate) || book.publishedYear],
  ['Series status', book.seriesStatus],
  ['Availability', availability?.label],
  ['Genre', book.genre],
].filter(([, value]) => value !== undefined && value !== null && value !== '')

function VolumeNav({ volumes, current }) {
  const index = volumes.findIndex((volume) => volume.id === current.id)
  const previous = index > 0 ? volumes[index - 1] : null
  const next = index >= 0 && index < volumes.length - 1 ? volumes[index + 1] : null
  const step = 'block border border-line p-5 transition-colors hover:border-electric'

  return (
    <nav aria-label="Volume navigation" className="grid gap-3 sm:grid-cols-3">
      {previous ? (
        <Link to={`/book/${previous.id}`} className={step}>
          <span className="eyebrow text-electric">← Previous volume</span>
          <span className="mt-2 block text-sm font-semibold text-moon">{previous.title}</span>
        </Link>
      ) : (
        <div className="border border-line/60 p-5 opacity-60">
          <span className="eyebrow text-mist">← Previous volume</span>
          <span className="mt-2 block text-sm text-mist">Start of the series</span>
        </div>
      )}

      <div aria-current="page" className="border border-electric/60 bg-electric/10 p-5">
        <span className="eyebrow text-electric">Current volume</span>
        <span className="mt-2 block text-sm font-semibold text-moon">
          {current.volumeNumber != null ? `Vol. ${current.volumeNumber}` : current.title}
        </span>
      </div>

      {next ? (
        <Link to={`/book/${next.id}`} className={`${step} sm:text-right`}>
          <span className="eyebrow text-electric">Next volume →</span>
          <span className="mt-2 block text-sm font-semibold text-moon">{next.title}</span>
        </Link>
      ) : (
        <div className="border border-line/60 p-5 text-left opacity-60 sm:text-right">
          <span className="eyebrow text-mist">Next volume →</span>
          <span className="mt-2 block text-sm text-mist">Latest in the series</span>
        </div>
      )}
    </nav>
  )
}

function QuantityStepper({ value, max, onChange, disabled }) {
  const btn = 'grid h-12 w-12 place-items-center text-lg text-moon transition-colors hover:bg-surface disabled:opacity-30'
  return (
    <div className="inline-flex items-center border border-line" role="group" aria-label="Quantity">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= 1} aria-label="Decrease quantity">−</button>
      <output aria-live="polite" className="w-10 text-center font-semibold tabular-nums">{value}</output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity">+</button>
    </div>
  )
}

function Purchase({ book }) {
  const [quantity, setQuantity] = useState(1)
  const stock = book.stock ?? 0
  // The server re-checks stock and sets the price; this limit just avoids obvious errors.
  const max = Math.max(1, Math.min(stock, 10))
  return (
    <div className="flex flex-wrap items-center gap-4">
      <QuantityStepper value={quantity} max={max} onChange={(n) => setQuantity(Math.min(max, Math.max(1, n)))} disabled={stock <= 0} />
      <AddToCartButton book={book} quantity={quantity} />
      <WishlistButton book={book} withLabel className="border border-line px-4" />
    </div>
  )
}

function ViewBook() {
  const { id } = useParams()
  const [state, setState] = useState({ id: null, status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await api.getBookById(id)
        const book = transformBook(res.data.book)
        let volumes = []
        if (book.series) {
          const seriesRes = await api.getBooks({ series: book.series, sort: 'volumeNumber', order: 'asc', limit: 50 }).catch(() => null)
          volumes = seriesRes ? transformBooks(seriesRes.data.books) : []
        }
        const related = transformBooks(res.data.relatedBooks ?? []).filter((b) => b.series !== book.series || !book.series)
        if (cancelled) return
        recordView(book)
        setState({ id, status: 'ready', book, volumes, related })
      } catch (error) {
        if (cancelled) return
        setState({ id, status: /not found|invalid/i.test(error.message) ? 'missing' : 'error', message: error.message })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, attempt])

  const status = state.id === id ? state.status : 'loading'

  if (status === 'loading') {
    return <div className="shell py-[clamp(3rem,7vw,6rem)]"><DetailsSkeleton /></div>
  }

  if (status === 'missing' || status === 'error') {
    return (
      <section className="shell py-[clamp(5rem,12vw,10rem)]" role="alert">
        <h1 className="text-headline">{status === 'missing' ? 'We couldn’t find that book.' : 'This book couldn’t be loaded.'}</h1>
        <p className="mt-6 max-w-md text-mist">{status === 'missing' ? 'It may have been removed from the catalogue.' : state.message}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          {status === 'error' && (
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="min-h-12 border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">Try again</button>
          )}
          <Link to="/all-books" className="inline-flex min-h-12 items-center bg-sakura px-6 font-semibold text-white transition-colors hover:bg-[#2563EB]">Browse all books</Link>
        </div>
      </section>
    )
  }

  const { book, volumes, related } = state
  const availability = availabilityOf(book.stock)
  const glow = book.colors?.[1] ?? '#2f6bff'

  return (
    <div key={book.id}>
      <section className="shell pt-8 pb-[clamp(4rem,9vw,8rem)]">
        <nav aria-label="Breadcrumb" className="eyebrow flex flex-wrap items-center gap-3 text-mist">
          <Link to="/all-books" className="inline-flex min-h-11 items-center hover:text-moon">Books</Link>
          {book.series && (
            <>
              <span aria-hidden="true">/</span>
              <Link to={`/series/${encodeURIComponent(book.series)}`} className="inline-flex min-h-11 items-center hover:text-moon">{book.series}</Link>
            </>
          )}
        </nav>

        <div className="mt-12 grid gap-14 lg:mt-16 lg:grid-cols-12 lg:gap-10">
          {/* Cover: opacity + rise + scale on arrival */}
          <div className="lg:col-span-5">
            <div className="relative isolate lg:sticky lg:top-28">
              <div
                aria-hidden="true"
                className="arrive-atmos absolute inset-[-12%] -z-10 rounded-full opacity-25 blur-3xl"
                style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }}
              />
              <div className="arrive-cover mx-auto w-[min(72vw,460px)] overflow-hidden rounded-md border border-line bg-panel shadow-[0_40px_80px_-44px_rgba(17,19,24,0.45)]">
                <BookCover book={book} eager sizes="(min-width: 1024px) 36vw, 72vw" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 lg:col-start-7 lg:pt-6">
            {book.series && (
              <p className="eyebrow arrive-rise text-electric" style={{ '--d': '150ms' }}>
                {book.series}{book.volumeNumber != null ? ` · Volume ${book.volumeNumber}` : ''}
              </p>
            )}
            <h1 className="arrive-rise text-headline mt-6 break-words" style={{ '--d': '260ms' }}>{book.title}</h1>
            <p className="arrive-rise mt-5 text-lg text-mist" style={{ '--d': '360ms' }}>by {book.author}</p>

            <div className="arrive-rise mt-12 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-line pt-10" style={{ '--d': '480ms' }}>
              <p className="font-display text-[clamp(2.25rem,4vw,3.25rem)] font-bold tabular-nums">{formatPrice(book.price)}</p>
              {book.originalPrice > book.price && (
                <p className="text-lg text-mist line-through tabular-nums">{formatPrice(book.originalPrice)}</p>
              )}
              {availability && <p className={`ml-auto text-sm font-semibold ${availability.tone}`}>{availability.label}</p>}
            </div>

            <div className="arrive-rise mt-8" style={{ '--d': '580ms' }}>
              <Purchase book={book} />
            </div>

            {volumes.length > 1 && book.volumeNumber != null && (
              <div className="arrive-rise mt-10" style={{ '--d': '630ms' }}>
                <VolumeNav volumes={volumes} current={book} />
              </div>
            )}

            <div className="arrive-rise mt-14" style={{ '--d': '680ms' }}>
              <p className="max-w-prose text-[1.075rem] leading-relaxed text-moon/85">{book.description}</p>
              <div className="mt-12 border-t border-line">
                <SmoothAccordion title="Book details" defaultOpen>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-10 gap-y-3 text-sm">
                    {detailRows(book, availability).map(([label, value]) => (
                      <div key={label} className="contents">
                        <dt className="text-mist">{label}</dt>
                        <dd className="text-moon">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </SmoothAccordion>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scenario 06: the rest of the series, in volume order */}
      {volumes.length > 1 && (
        <section aria-labelledby="series-strip" className="border-t border-line bg-panel">
          <div className="shell py-[clamp(4rem,9vw,8rem)]">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow text-mist">The series</p>
                <h2 id="series-strip" className="text-title mt-5">{book.series}</h2>
              </div>
              <Link to={`/series/${encodeURIComponent(book.series)}`} className="nav-link inline-flex min-h-11 items-center text-sm font-semibold">
                Explore the series →
              </Link>
            </div>
            <StaggeredReveal as="ol" itemAs="li" className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-4 sm:gap-x-8 lg:grid-cols-6" step={90}>
              {volumes.map((v) => (
                <div key={v.id} className={v.id === book.id ? 'opacity-50' : ''}>
                  <p className="eyebrow mb-3 text-mist">{v.volumeNumber != null ? `Vol. ${v.volumeNumber}` : '—'}{v.id === book.id ? ' · viewing' : ''}</p>
                  <BookCard book={v} sizes="(min-width: 1024px) 14vw, 45vw" />
                </div>
              ))}
            </StaggeredReveal>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="shell py-[clamp(4rem,9vw,8rem)]">
          <Reveal>
            <p className="eyebrow text-mist">Same genre</p>
            <h2 id="related-title" className="text-title mt-5">You might also like</h2>
          </Reveal>
          <StaggeredReveal className="mt-14 grid grid-cols-2 gap-x-5 gap-y-14 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-12" step={90}>
            {related.map((b) => <BookCard key={b.id} book={b} sizes="(min-width: 1024px) 20vw, 45vw" />)}
          </StaggeredReveal>
        </section>
      )}
    </div>
  )
}

export default ViewBook
