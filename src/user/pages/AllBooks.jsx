import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { transformBooks } from '../../data/books'
import { api } from '../../api/client'
import { StaggeredReveal, TextReveal } from '../../motion/Reveal'
import BookCard from '../components/BookCard'
import { GridSkeleton } from '../components/Skeletons'

const SORTS = {
  newest: { label: 'Newest', sort: 'createdAt', order: 'desc' },
  title: { label: 'Title A–Z', sort: 'title', order: 'asc' },
  low: { label: 'Price: low to high', sort: 'price', order: 'asc' },
  high: { label: 'Price: high to low', sort: 'price', order: 'desc' },
  rating: { label: 'Top rated', sort: 'rating', order: 'desc' },
}
const PAGE_SIZE = 20
const GRID = 'grid grid-cols-2 gap-x-5 gap-y-16 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-10 2xl:grid-cols-5'

function AllBooks() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const genre = params.get('genre') ?? ''
  // The store's hand-picked shelf. Reachable from the footer and the home page.
  const featuredOnly = params.get('featured') === '1'
  const sortKey = SORTS[params.get('sort')] ? params.get('sort') : 'newest'
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [result, setResult] = useState({ key: '', status: 'loading', books: [], total: 0, pages: 1 })
  const [genres, setGenres] = useState([])
  const [attempt, setAttempt] = useState(0)
  const gridTop = useRef(null)

  // Search box: typed text is kept locally and written to the URL after a pause,
  // so we don't fire a request per keystroke. If the URL changes from elsewhere
  // (e.g. the header search) the box follows it.
  const [draft, setDraft] = useState(search)
  const [urlSearch, setUrlSearch] = useState(search)
  if (search !== urlSearch) {
    setUrlSearch(search)
    if (search !== draft.trim()) setDraft(search)
  }

  const update = (patch) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value && !(key === 'sort' && value === 'newest') && !(key === 'page' && value === 1)) next.set(key, value)
      else next.delete(key)
    }
    // Any filter change starts again at page 1.
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  useEffect(() => {
    if (draft.trim() === search) return undefined
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params)
      if (draft.trim()) next.set('search', draft.trim())
      else next.delete('search')
      next.delete('page')
      setParams(next, { replace: true })
    }, 350)
    return () => clearTimeout(timer)
  }, [draft, search, params, setParams])

  useEffect(() => {
    api.getCategories()
      .then((res) => setGenres(res.data.categories.filter((c) => c.bookCount > 0).map((c) => c.name)))
      .catch(() => setGenres([]))
  }, [])

  const key = `${search}|${genre}|${featuredOnly}|${sortKey}|${page}|${attempt}`

  useEffect(() => {
    let cancelled = false
    const { sort, order } = SORTS[sortKey]
    api.getBooks({
      search: search || undefined,
      category: genre || undefined,
      featured: featuredOnly ? 'true' : undefined,
      sort,
      order,
      page,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return
        const { pagination } = res.data
        setResult({ key, status: 'ready', books: transformBooks(res.data.books), total: pagination.totalBooks, pages: pagination.totalPages || 1 })
      })
      .catch((error) => {
        if (!cancelled) setResult({ key, status: 'error', books: [], total: 0, pages: 1, message: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [key, search, genre, featuredOnly, sortKey, page])

  const status = result.key === key ? result.status : 'loading'

  const goToPage = (next) => {
    update({ page: next })
    gridTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const chip = (active) =>
    `min-h-11 shrink-0 border px-5 text-sm transition-colors duration-300 ${active ? 'border-electric bg-electric/10 text-moon' : 'border-line text-mist hover:border-electric/50 hover:text-moon'}`

  const heading = search
    ? ['Results for', `“${search}”`]
    : genre
      ? [genre, 'collection.']
      : featuredOnly
        ? ['The hand-picked', 'shelf.']
        : ['Every volume,', 'in one place.']

  return (
    <div>
      <header className="shell pt-[clamp(3rem,8vw,7rem)] pb-[clamp(2.5rem,5vw,4.5rem)]">
        <p className="eyebrow text-mist"><span className="text-electric">(Shop)</span> — The collection</p>
        <TextReveal key={heading.join()} as="h1" lines={heading} className="text-headline mt-8 max-w-5xl break-words" />
        <p className="mt-8 text-sm text-mist" aria-live="polite">
          {status === 'ready' ? `${result.total} ${result.total === 1 ? 'title' : 'titles'}` : status === 'loading' ? 'Loading titles…' : ''}
        </p>
      </header>

      <div className="sticky top-[72px] z-30 border-y border-line bg-ink/85 backdrop-blur-xl">
        <div className="shell flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:gap-8">
          <label className="flex min-h-11 flex-1 items-center gap-3 border-b border-line focus-within:border-electric lg:max-w-sm">
            <span className="sr-only">Search books</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 text-mist">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Title, author or series"
              className="min-w-0 flex-1 bg-transparent py-2 text-moon outline-none placeholder:text-mist"
            />
          </label>

          <div role="group" aria-label="Filter by genre" className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-1">
            <button type="button" onClick={() => update({ featured: featuredOnly ? '' : '1' })} aria-pressed={featuredOnly} className={chip(featuredOnly)}>Featured</button>
            <button type="button" onClick={() => update({ genre: '' })} aria-pressed={!genre} className={chip(!genre)}>All</button>
            {genres.map((g) => (
              <button key={g} type="button" onClick={() => update({ genre: g })} aria-pressed={genre === g} className={chip(genre === g)}>{g}</button>
            ))}
          </div>

          <label className="flex min-h-11 items-center gap-3 text-sm text-mist">
            Sort
            <select
              value={sortKey}
              onChange={(e) => update({ sort: e.target.value })}
              className="min-h-11 border border-line bg-panel px-3 text-moon"
            >
              {Object.entries(SORTS).map(([value, { label }]) => (
                <option key={value} value={value} className="bg-panel text-moon">{label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section ref={gridTop} aria-label="Books" className="shell scroll-mt-40 py-[clamp(3.5rem,7vw,7rem)]">
        {status === 'loading' && <GridSkeleton count={10} className={GRID} />}

        {status === 'error' && (
          <div role="alert" className="py-16">
            <h2 className="text-title">The catalogue couldn’t be loaded.</h2>
            <p className="mt-4 text-mist">{result.message}</p>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-8 min-h-12 border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && result.books.length === 0 && (
          <div className="py-16">
            <h2 className="text-title">No books match those filters.</h2>
            <p className="mt-4 text-mist">Try a different spelling, a series name, or another genre.</p>
            <button
              type="button"
              onClick={() => setParams({}, { replace: true })}
              className="mt-8 min-h-12 bg-sakura px-6 font-semibold text-white transition-colors hover:bg-[#2563EB]"
            >
              Clear filters
            </button>
          </div>
        )}

        {status === 'ready' && result.books.length > 0 && (
          <>
            <StaggeredReveal key={key} className={GRID} step={55} variant="up">
              {result.books.map((b) => (
                <BookCard key={b.id} book={b} sizes="(min-width: 1536px) 16vw, (min-width: 1024px) 20vw, (min-width: 640px) 30vw, 45vw" />
              ))}
            </StaggeredReveal>

            {result.pages > 1 && (
              <nav aria-label="Pagination" className="mt-24 flex items-center justify-center gap-2">
                <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} className="min-h-11 px-4 text-sm text-mist hover:text-moon disabled:opacity-30">
                  Previous
                </button>
                {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => goToPage(n)}
                    aria-current={n === page ? 'page' : undefined}
                    className={`grid h-11 w-11 place-items-center text-sm tabular-nums ${n === page ? 'border border-electric text-moon' : 'text-mist hover:text-moon'}`}
                  >
                    {n}
                  </button>
                ))}
                <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= result.pages} className="min-h-11 px-4 text-sm text-mist hover:text-moon disabled:opacity-30">
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default AllBooks
