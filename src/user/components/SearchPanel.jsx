import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { formatPrice } from '../../utils/format'
import BookCover from './BookCover'
import { RowSkeleton } from './Skeletons'

const DEBOUNCE_MS = 250
const MIN_LENGTH = 2

/**
 * Live search (Scenario 08). Requests are debounced, and each new query aborts
 * the previous request so slow responses can never overwrite newer results.
 * The input is an ARIA combobox: arrow keys move through results, Enter opens
 * the highlighted book (or the full results page), Escape closes the panel.
 */
function SearchPanel({ onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listId = useId()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState({ query: '', status: 'idle', books: [], error: '' })
  const [active, setActive] = useState(-1)
  const [attempt, setAttempt] = useState(0)

  const q = query.trim()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (q.length < MIN_LENGTH) return undefined
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await api.searchBooks(q, { limit: 8, signal: controller.signal })
        setResult({ query: q, status: 'ready', books: res.data.books, error: '' })
        setActive(-1)
      } catch (error) {
        if (error.name === 'AbortError') return
        setResult({ query: q, status: 'error', books: [], error: error.message })
      }
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q, attempt])

  // Results belong to the query they were fetched for; anything else is still loading.
  const status = q.length < MIN_LENGTH ? 'idle' : result.query === q ? result.status : 'loading'
  const books = status === 'ready' ? result.books : []

  const open = (book) => {
    onClose()
    navigate(`/view/${book._id}/book`)
  }

  const seeAll = () => {
    if (!q) return
    onClose()
    navigate(`/all-books?search=${encodeURIComponent(q)}`)
  }

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' && books.length) {
      event.preventDefault()
      setActive((i) => (i + 1) % books.length)
    } else if (event.key === 'ArrowUp' && books.length) {
      event.preventDefault()
      setActive((i) => (i <= 0 ? books.length - 1 : i - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (active >= 0 && books[active]) open(books[active])
      else seeAll()
    }
  }

  return (
    <div className="drop-in border-t border-line bg-ink/95 backdrop-blur-xl">
      <div className="shell py-8 sm:py-12">
        <div className="flex items-center gap-4 border-b border-line pb-4 focus-within:border-electric">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 text-mist">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={books.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            aria-label="Search books by title, author or series"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search by title, author or series"
            className="min-w-0 flex-1 bg-transparent font-display text-[clamp(1.4rem,4vw,2.6rem)] font-semibold tracking-tight text-moon outline-none placeholder:text-mist"
          />
          <button type="button" onClick={onClose} className="min-h-11 shrink-0 px-2 text-sm text-mist hover:text-moon">
            Close <span className="sr-only">search</span>
          </button>
        </div>

        <div className={books.length ? "sr-only" : "mt-6 min-h-24"} aria-live="polite">
          {books.length > 0 && <p>{books.length} {books.length === 1 ? "book" : "books"} found</p>}
          {status === 'idle' && (
            <p className="text-sm text-mist">
              Type at least two letters. Try a series (“Chainsaw Man”), an author (“Toriyama”) or part of a title.
              <span className="hidden sm:inline"> Use ↑ ↓ to move, Enter to open.</span>
            </p>
          )}
          {status === 'loading' && <RowSkeleton count={3} />}
          {status === 'error' && (
            <p className="text-sm text-red-600">
              Search isn’t available right now ({result.error}).{' '}
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold text-electric underline">
                Try again
              </button>
            </p>
          )}
          {status === 'ready' && books.length === 0 && (
            <p className="text-sm text-mist">No books match “{q}”. Check the spelling or try the series name.</p>
          )}
        </div>

        {books.length > 0 && (
          <>
            <ul id={listId} role="listbox" aria-label="Matching books" className="mt-6 grid gap-1 sm:grid-cols-2">
              {books.map((book, i) => (
                <li
                  key={book._id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onClick={() => open(book)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-4 rounded-md p-2 transition-colors duration-200 ${i === active ? 'bg-surface' : ''}`}
                >
                  <div className="w-11 shrink-0 overflow-hidden">
                    <BookCover book={book} sizes="44px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-moon">{book.title}</p>
                    <p className="truncate text-sm text-mist">{book.author}</p>
                  </div>
                  <p className="shrink-0 text-sm text-moon tabular-nums">{formatPrice(book.price)}</p>
                </li>
              ))}
            </ul>
            <button type="button" onClick={seeAll} className="mt-6 min-h-11 text-sm font-semibold text-electric hover:underline">
              See all results for “{q}” →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default SearchPanel
