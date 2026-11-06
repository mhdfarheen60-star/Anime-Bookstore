import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { Reveal, StaggeredReveal } from '../../motion/Reveal'

// Author spotlights are built from the real catalogue: one card per author
// that is actually stocked, linking to that author's titles in the catalogue.
function Authors() {
  const [state, setState] = useState({ status: 'loading', authors: [] })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.getAuthors()
      .then((res) => {
        if (!cancelled) setState({ status: 'ready', authors: res.data?.authors ?? [] })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', authors: [], message: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  return (
    <div>
      <header className="shell pt-[clamp(3rem,8vw,7rem)] pb-[clamp(2.5rem,5vw,4rem)]">
        <p className="eyebrow text-mist"><span className="text-electric">(Discover)</span> — On the shelf</p>
        <h1 className="text-headline mt-8 max-w-4xl break-words">Author Spotlights.</h1>
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-mist">
          The creators behind the volumes the store stocks. Pick a name to see everything by them.
        </p>
      </header>

      <section aria-label="Authors" className="shell pb-[clamp(4rem,9vw,8rem)]">
        {state.status === 'loading' && (
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 w-32 bg-panel" />
                <div className="mt-4 h-6 w-3/4 bg-panel" />
                <div className="mt-3 h-3 w-24 bg-panel" />
              </div>
            ))}
          </div>
        )}

        {state.status === 'error' && (
          <div role="alert" className="py-16">
            <h2 className="text-title">The author list couldn’t be loaded.</h2>
            <p className="mt-4 text-mist">{state.message}</p>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-8 min-h-12 border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">
              Try again
            </button>
          </div>
        )}

        {state.status === 'ready' && state.authors.length === 0 && (
          <div className="py-16">
            <h2 className="text-title">No authors to show yet.</h2>
            <p className="mt-4 max-w-md text-mist">Once volumes are added to the catalogue, their creators appear here.</p>
            <Link to="/all-books" className="mt-8 inline-flex min-h-12 items-center bg-sakura px-6 font-semibold text-white transition-colors hover:bg-[#2563EB]">
              Browse all books
            </Link>
          </div>
        )}

        {state.status === 'ready' && state.authors.length > 0 && (
          <StaggeredReveal className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" step={50}>
            {state.authors.map((author) => (
              <Reveal key={author.name} as="article" className="border-t border-line pt-6">
                <p className="eyebrow text-electric">
                  {author.count} {author.count === 1 ? 'title' : 'titles'}
                  {author.category ? ` · ${author.category}` : ''}
                </p>
                <h2 className="mt-3 font-display text-xl font-bold leading-snug tracking-tight">
                  <Link
                    to={`/all-books?search=${encodeURIComponent(author.name)}`}
                    className="transition-colors duration-300 hover:text-electric"
                  >
                    {author.name}
                  </Link>
                </h2>
                {author.series?.length > 0 && (
                  <p className="mt-3 text-sm leading-relaxed text-mist">
                    {author.series.slice(0, 3).join(' · ')}
                    {author.series.length > 3 ? ' ·' : ''}
                  </p>
                )}
                <Link
                  to={`/all-books?search=${encodeURIComponent(author.name)}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-moon transition-colors hover:text-electric"
                >
                  See their titles <span aria-hidden="true">→</span>
                </Link>
              </Reveal>
            ))}
          </StaggeredReveal>
        )}
      </section>
    </div>
  )
}

export default Authors
