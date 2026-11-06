import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { Reveal, StaggeredReveal, TextReveal } from '../../motion/Reveal'
import PostCover, { PostMeta } from '../components/PostCover'

const PAGE_SIZE = 9

// Turns the plain-text body into readable blocks: "## " opens a section
// heading, "- " a bullet, anything else a paragraph.
const headline = ['The reading room.', 'Shelf notes & guides.']

function Blog() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const category = params.get('category') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [state, setState] = useState({ key: '', status: 'loading', posts: [], total: 0, pages: 1 })
  const [featured, setFeatured] = useState(null)
  const [categories, setCategories] = useState([])
  const [attempt, setAttempt] = useState(0)
  const [draft, setDraft] = useState(search)
  const listTop = useRef(null)

  const update = (patch) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  // Search is written to the URL after a pause so we do not request per keystroke.
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
    api.getBlogCategories()
      .then((res) => setCategories(res.data?.categories ?? []))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    api.getFeaturedBlogPost()
      .then((res) => {
        if (!cancelled) setFeatured(res.data?.post ?? null)
      })
      .catch(() => {
        if (!cancelled) setFeatured(null)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const key = `${search}|${category}|${page}|${attempt}`

  useEffect(() => {
    let cancelled = false
    api.getBlogPosts({ search: search || undefined, category: category || undefined, page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return
        const { pagination } = res.data
        setState({
          key,
          status: 'ready',
          posts: res.data.posts ?? [],
          total: pagination.totalPosts,
          pages: pagination.totalPages || 1,
        })
      })
      .catch((error) => {
        if (!cancelled) setState({ key, status: 'error', posts: [], total: 0, pages: 1, message: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [key, search, category, page])

  const status = state.key === key ? state.status : 'loading'

  const goToPage = (next) => {
    update({ page: next === 1 ? '' : String(next) })
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const chip = (active) =>
    `min-h-11 shrink-0 border px-5 text-sm transition-colors duration-300 ${active ? 'border-electric bg-electric/10 text-moon' : 'border-line text-mist hover:border-electric/50 hover:text-moon'}`

  // The lead story only makes sense on the unfiltered first page.
  const showFeatured = Boolean(featured) && !search && !category && page === 1

  return (
    <div>
      <header className="shell pt-[clamp(3rem,8vw,7rem)] pb-[clamp(2.5rem,5vw,4rem)]">
        <p className="eyebrow text-mist"><span className="text-electric">(Journal)</span> — From the store</p>
        <TextReveal key={headline.join()} as="h1" lines={headline} className="text-headline mt-8 max-w-4xl break-words" />
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-mist">
          Release notes, collecting guides and shelf talk — written by the people who run the store.
        </p>
      </header>

      {/* Lead story */}
      {showFeatured && (
        <section aria-label="Featured article" className="shell pb-[clamp(2.5rem,5vw,4rem)]">
          <Reveal>
            <Link
              to={`/blog/${featured.slug}`}
              className="group grid gap-8 overflow-hidden rounded-xl border border-line bg-panel transition-colors duration-500 hover:border-electric/40 lg:grid-cols-12 lg:gap-0"
            >
              <div className="aspect-[16/10] overflow-hidden lg:col-span-7 lg:aspect-[4/3]">
                <PostCover post={featured} eager sizes="(min-width: 1024px) 58vw, 100vw" className="transition-transform duration-700 group-hover:scale-[1.03]" />
              </div>
              <div className="flex flex-col justify-center gap-5 p-8 lg:col-span-5 lg:p-12">
                <p className="eyebrow text-electric">Featured · {featured.category}</p>
                <h2 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{featured.title}</h2>
                {featured.excerpt && <p className="leading-relaxed text-mist">{featured.excerpt}</p>}
                <PostMeta post={featured} />
                <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-moon">
                  Read the article
                  <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </span>
              </div>
            </Link>
          </Reveal>
        </section>
      )}

      {/* Filters */}
      <div className="sticky top-[72px] z-30 border-y border-line bg-ink/85 backdrop-blur-xl">
        <div className="shell flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:gap-8">
          <label className="flex min-h-11 flex-1 items-center gap-3 border-b border-line focus-within:border-electric lg:max-w-sm">
            <span className="sr-only">Search articles</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 text-mist">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search the journal"
              className="min-w-0 flex-1 bg-transparent py-2 text-moon outline-none placeholder:text-mist"
            />
          </label>

          <div role="group" aria-label="Filter by category" className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-1">
            <button type="button" onClick={() => update({ category: '' })} aria-pressed={!category} className={chip(!category)}>All</button>
            {categories.map((c) => (
              <button key={c.name} type="button" onClick={() => update({ category: c.name })} aria-pressed={category === c.name} className={chip(category === c.name)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section ref={listTop} aria-label="Articles" className="shell scroll-mt-40 py-[clamp(3rem,6vw,5.5rem)]">
        {status === 'loading' && (
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[16/10] bg-panel" />
                <div className="mt-5 h-3 w-24 bg-panel" />
                <div className="mt-4 h-6 w-4/5 bg-panel" />
                <div className="mt-3 h-3 w-full bg-panel" />
              </div>
            ))}
          </div>
        )}

        {status === 'error' && (
          <div role="alert" className="py-16">
            <h2 className="text-title">The journal couldn’t be loaded.</h2>
            <p className="mt-4 text-mist">{state.message}</p>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-8 min-h-12 border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && state.posts.length === 0 && (
          <div className="py-16">
            <h2 className="text-title">{search || category ? 'No articles match that yet.' : 'The first chapter is still being written.'}</h2>
            <p className="mt-4 max-w-md text-mist">
              {search || category
                ? 'Try a different search term or another category.'
                : 'Published articles appear here as soon as the store publishes them. In the meantime, the catalogue is open.'}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              {search || category ? (
                <button type="button" onClick={() => { setDraft(''); setParams({}, { replace: true }) }} className="min-h-12 border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">
                  Clear filters
                </button>
              ) : null}
              <Link to="/all-books" className="inline-flex min-h-12 items-center bg-sakura px-6 font-semibold text-white transition-colors hover:bg-[#2563EB]">
                Browse all books
              </Link>
            </div>
          </div>
        )}

        {status === 'ready' && state.posts.length > 0 && (
          <>
            <StaggeredReveal key={key} className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3" step={60} variant="up">
              {state.posts.map((post) => (
                <article key={post._id} className="group flex flex-col">
                  <Link to={`/blog/${post.slug}`} className="block aspect-[16/10] overflow-hidden bg-panel">
                    <PostCover post={post} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" className="transition-transform duration-700 group-hover:scale-[1.04]" />
                  </Link>
                  <p className="eyebrow mt-5 text-electric">{post.category}</p>
                  <h3 className="mt-3 font-display text-xl font-bold leading-snug tracking-tight">
                    <Link to={`/blog/${post.slug}`} className="transition-colors duration-300 hover:text-electric">{post.title}</Link>
                  </h3>
                  {post.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-mist">{post.excerpt}</p>}
                  <PostMeta post={post} className="mt-4" />
                </article>
              ))}
            </StaggeredReveal>

            {state.pages > 1 && (
              <nav aria-label="Pagination" className="mt-20 flex items-center justify-center gap-2">
                <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} className="min-h-11 px-4 text-sm text-mist hover:text-moon disabled:opacity-30">
                  Previous
                </button>
                {Array.from({ length: state.pages }, (_, i) => i + 1).map((n) => (
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
                <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= state.pages} className="min-h-11 px-4 text-sm text-mist hover:text-moon disabled:opacity-30">
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

export default Blog
