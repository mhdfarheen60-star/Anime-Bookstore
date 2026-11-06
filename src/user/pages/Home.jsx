import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { transformBooks } from '../../data/books'
import { formatPrice } from '../../utils/format'
import { getRecentlyViewed } from '../../utils/recentlyViewed'
import { useInView } from '../../motion/hooks'
import { Reveal, StaggeredReveal, TextReveal } from '../../motion/Reveal'
import { ParallaxLayer, ParallaxScene, ScrollLayer } from '../../motion/Parallax'
import MagneticButton from '../../motion/MagneticButton'
import BookCard from '../components/BookCard'
import BookCover from '../components/BookCover'
import WishlistButton from '../components/WishlistButton'
import AddToCartButton from '../components/AddToCartButton'
import { GridSkeleton, LineSkeleton } from '../components/Skeletons'
import { PostMeta } from '../components/PostCover'

function Arrow({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`h-4 w-4 ${className}`}>
      <path d="M4 12h15m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Small "(02) â€” New arrivals" label used to number the homepage chapters. */
function Chapter({ children, className = '', style }) {
  return (
    <p className={`eyebrow flex items-center gap-4 text-mist ${className}`} style={style}>
      <span aria-hidden="true" className="h-px w-10 bg-line" />
      {children}
    </p>
  )
}

/** Soft violet/blue light that drifts slowly; paused while off screen. */
function Atmosphere({ className = '', strong = false }) {
  const [ref, inView] = useInView({ once: false, rootMargin: '0px' })
  return (
    <div ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${inView ? '' : 'atmos-paused'} ${className}`}>
      <div className={`atmos-drift absolute -top-1/3 left-[30%] h-[85vmax] w-[85vmax] rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.10),transparent)] ${strong ? 'opacity-100' : 'opacity-70'}`} />
      <div className="atmos-drift absolute top-1/4 -left-1/3 h-[65vmax] w-[65vmax] rounded-full bg-[radial-gradient(closest-side,rgba(96,165,250,0.08),transparent)] [animation-delay:-11s]" />
    </div>
  )
}

// ---- Data ------------------------------------------------------------------

function useHomeData() {
  const [state, setState] = useState({ status: 'loading' })

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    const [featured, newest, series, categories] = await Promise.allSettled([
      api.getFeaturedBooks(8),
      api.getBooks({ sort: 'createdAt', order: 'desc', limit: 8 }),
      api.getSeries(),
      api.getCategories(),
    ])
    if (newest.status === 'rejected') {
      setState({ status: 'error', message: newest.reason?.message })
      return
    }
    // A malformed payload must not strand the page on skeletons; fall back to
    // empty sections instead.
    try {
      setState({
        status: 'ready',
        featured: featured.status === 'fulfilled' ? transformBooks(featured.value.data?.books ?? []) : [],
        newest: transformBooks(newest.value.data?.books ?? []),
        totalBooks: newest.value.data?.pagination?.totalBooks,
        series: series.status === 'fulfilled' ? series.value.data?.series ?? [] : [],
        categories: categories.status === 'fulfilled'
          ? (categories.value.data?.categories ?? []).filter((c) => c.bookCount > 0).sort((a, b) => b.bookCount - a.bookCount)
          : [],
      })
    } catch (error) {
      setState({ status: 'error', message: error?.message || 'Could not load the catalogue' })
    }
  }, [])

  // Initial data fetch (setState happens after the awaits inside load).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch
    load()
  }, [load])

  const retry = () => {
    setState({ status: 'loading' })
    load()
  }

  return { ...state, retry }
}

// ---- Scenario 01 + 02: cinematic arrival / expansive hero ------------------

function Hero() {
  return (
    // A cinematic single-column hero: the artwork carries the right side, while
    // the copy stays on the left where the scrim is darkest.
    <ParallaxScene as="section" aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* Full-bleed artwork: `cover` preserves the original ratio and the
          overlays keep the copy readable without flattening the image. */}
      <div aria-hidden="true" className="absolute inset-0 -z-20">
        <div className="hero-art absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/25 sm:from-white sm:via-white/80 sm:to-white/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-white/45" />
      </div>
      <ScrollLayer depth={80} aria-hidden="true" className="absolute inset-0 -z-10">
        <ParallaxLayer depth={-16} className="arrive-atmos absolute inset-0">
          <Atmosphere strong />
        </ParallaxLayer>
      </ScrollLayer>
      <ScrollLayer depth={140} aria-hidden="true" className="pointer-events-none absolute top-[4%] right-[-6vw] -z-10">
        <ParallaxLayer
          depth={-34}
          className="arrive-atmos font-jp text-[clamp(16rem,40vw,44rem)] leading-none text-moon/[0.05] select-none"
        >
          本
        </ParallaxLayer>
      </ScrollLayer>
      {/* Fine editorial grid lines */}
      <div aria-hidden="true" className="arrive-atmos pointer-events-none absolute inset-0 -z-10 hidden lg:block">
        <div className="shell relative h-full">
          <span className="absolute inset-y-0 left-[58%] w-px bg-moon/[0.06]" />
        </div>
      </div>

      <div className="shell hero-stage relative flex items-center">
        <div className="w-full max-w-3xl pt-16 pb-20 lg:pt-24 lg:pb-28">
          <Chapter className="arrive-rise" style={{ '--d': '60ms' }}>Manga · Light novels · Collector editions</Chapter>
          <TextReveal
            as="h1"
            arrive
            lines={['Stories', 'beyond', <>the <span className="text-electric">panel.</span></>]}
            className="text-display mt-10 text-moon [text-shadow:0_1px_28px_rgba(255,255,255,0.85)]"
            id="hero-title"
          />
          <p className="arrive-rise mt-10 max-w-md text-[1.075rem] leading-relaxed text-moon/85" style={{ '--d': '480ms' }}>
            A curated shelf of manga and light novels. Every title is shown with the cover of the exact edition and volume you’ll receive.
          </p>
          <div className="arrive-rise mt-12 flex flex-wrap items-center gap-x-10 gap-y-6" style={{ '--d': '600ms' }}>
            <MagneticButton
              as={Link}
              to="/all-books"
              className="group inline-flex min-h-14 items-center gap-5 bg-sakura px-8 font-semibold text-white hover:bg-[#2563EB]"
            >
              Explore the collection
              <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />
            </MagneticButton>
            <Link to="/series" className="nav-link inline-flex min-h-11 items-center text-sm font-semibold text-moon/80 hover:text-moon">
              Browse by series
            </Link>
          </div>
        </div>
      </div>
    </ParallaxScene>
  )
}

// ---- Scenario 03 A + B: new arrivals ----------------------------------------

function NewArrivals({ books }) {
  return (
    <section aria-labelledby="new-title" className="shell section-y pt-[clamp(3.5rem,7vw,7rem)]">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <Chapter>New arrivals</Chapter>
          <TextReveal as="h2" id="new-title" lines={['Just landed', 'on the shelf.']} className="text-headline mt-8" />
        </div>
        <Reveal className="max-w-sm lg:col-span-4 lg:justify-self-end" delay={200}>
          <p className="leading-relaxed text-mist">The most recent volumes added to the catalogue, newest first.</p>
          <Link to="/all-books" className="nav-link mt-6 inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-moon">
            View the full collection <Arrow />
          </Link>
        </Reveal>
      </div>
      <StaggeredReveal
        className="mt-20 grid grid-cols-2 gap-x-5 gap-y-14 sm:gap-x-8 lg:mt-28 lg:grid-cols-4 lg:gap-x-12"
        itemClassName="lg:even:mt-20"
        step={70}
      >
        {books.slice(0, 8).map((b) => (
          <BookCard key={b.id} book={b} sizes="(min-width: 1024px) 20vw, 45vw" />
        ))}
      </StaggeredReveal>
    </section>
  )
}

// ---- Reading Journal / Blog -----------------------------------------------

function BlogJournal() {
  const [state, setState] = useState({ status: 'loading', posts: [] })

  useEffect(() => {
    let cancelled = false
    api
      .getBlogPosts({ limit: 3 })
      .then((res) => {
        if (cancelled) return
        setState({ status: 'ready', posts: res.data?.posts ?? [] })
      })
      .catch(() => {
        if (cancelled) return
        setState({ status: 'error', posts: [] })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const posts = state.posts.slice(0, 3)
  const fallbackPosts = [
    {
      slug: 'pain-tragedy-naruto',
      title: "Pain: The Tragedy Behind Naruto's Most Powerful Antagonist",
      category: "CHARACTER SPOTLIGHT",
      excerpt: "Discover Pain's tragic past, the power of the Rinnegan, and his unforgettable philosophy about peace and suffering.",
      coverImage: 'https://wallpapercave.com/wp/wp7576826.jpg',
      publishedAt: new Date().toISOString(),
      readingTime: 6,
    },
    {
      slug: 'where-to-start-manga-collection',
      title: "Where to Start Your Manga Collection",
      category: "COLLECTOR'S GUIDE",
      excerpt: "A beginner-friendly guide to choosing your first manga series, understanding editions, and building a collection.",
      coverImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1600&q=80',
      publishedAt: new Date().toISOString(),
      readingTime: 5,
    },
    {
      slug: 'manga-vs-anime-differences',
      title: "Manga vs. Anime: What Makes Each Special?",
      category: "ANIME CULTURE",
      excerpt: "Explore the differences between manga and anime, including storytelling, artwork, pacing, and exclusive content.",
      coverImage: 'https://images.unsplash.com/photo-1578632749014-ca77efd052eb?auto=format&fit=crop&w=1600&q=80',
      publishedAt: new Date().toISOString(),
      readingTime: 4,
    },
  ]

  const displayPosts = posts.length > 0 ? posts : fallbackPosts

  return (
    <section aria-labelledby="journal-title" className="shell section-y">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-mist">THE READING JOURNAL</p>
          <TextReveal as="h2" id="journal-title" lines={['Stories behind', 'the stories.']} className="text-headline mt-8" />
          <p className="mt-6 max-w-xl leading-relaxed text-mist">
            Explore anime culture, manga discoveries, character deep dives, collector guides, and the worlds behind your favorite series.
          </p>
        </div>
        <Reveal delay={200} className="lg:pb-2">
          <Link to="/blog" className="nav-link inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-moon">
            View All Articles →
          </Link>
        </Reveal>
      </div>

      {state.status === 'loading' && (
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-xl border border-line bg-panel">
              <div className="aspect-[16/10] bg-surface" />
              <div className="p-6">
                <div className="h-3 w-24 rounded bg-surface" />
                <div className="mt-4 h-6 w-4/5 rounded bg-surface" />
                <div className="mt-3 h-3 w-full rounded bg-surface" />
                <div className="mt-3 h-3 w-2/3 rounded bg-surface" />
                <div className="mt-6 h-3 w-32 rounded bg-surface" />
              </div>
            </div>
          ))}
        </div>
      )}

      {(state.status === 'ready' || state.status === 'error') && (
        <StaggeredReveal
          className="mt-16 grid gap-8 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3"
          step={80}
          variant="fade"
        >
          {displayPosts.map((post) => (
            <article key={post.slug}>
              <Link
                to={/blog/}
                className="group block h-full overflow-hidden rounded-xl border border-line bg-panel transition-all duration-500 hover:-translate-y-1 hover:border-electric/40 hover:shadow-[0_30px_60px_-40px_rgba(17,19,24,0.28)]"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  {post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-surface">
                      <span className="font-jp text-4xl text-electric/60">本</span>
                    </div>
                  )}
                </div>
                <div className="flex h-full flex-col p-6">
                  <p className="eyebrow text-electric">{post.category || 'JOURNAL'}</p>
                  <h3 className="mt-4 font-display text-xl font-bold leading-tight tracking-tight text-moon">{post.title}</h3>
                  {post.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-mist">{post.excerpt}</p>}
                  <div className="mt-auto flex items-center justify-between pt-6 text-xs text-mist">
                    <PostMeta post={post} />
                    <span className="inline-flex items-center gap-2 font-semibold text-moon">
                      Read Article
                      <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </StaggeredReveal>
      )}
    </section>
  )
}
// ---- Scenario 03 D + 04: featured collection, floating gallery ---------------

function FeaturedCollection({ books }) {
  if (!books.length) return null
  const [lead, ...rest] = books
  return (
    <section aria-labelledby="featured-title" className="py-[clamp(2rem,6vw,6rem)]">
      <Reveal variant="expand" className="relative isolate overflow-hidden border-y border-line bg-surface">
        <Atmosphere />
        <div className="shell section-y">
          <Chapter>Featured</Chapter>
          <TextReveal as="h2" id="featured-title" lines={['Curated for', 'the collection.']} className="text-headline mt-8 max-w-4xl" />

          {/* The lead book takes the stage. */}
          <div className="mt-20 grid gap-12 lg:mt-28 lg:grid-cols-12 lg:items-center lg:gap-10">
            <Reveal variant="scale" className="mx-auto w-[min(72vw,440px)] lg:col-span-5 lg:mx-0 lg:w-full">
              <Link to={`/view/${lead.id}/book`} className="card-motion block">
                <div className="card-frame card-cover card-lift overflow-hidden rounded-md border border-line bg-panel shadow-[0_36px_72px_-42px_rgba(17,19,24,0.42)]">
                  <BookCover book={lead} sizes="(min-width: 1024px) 34vw, 72vw" />
                </div>
              </Link>
            </Reveal>
            <Reveal delay={150} className="lg:col-span-6 lg:col-start-7">
              {lead.series && (
                <p className="eyebrow text-electric">
                  {lead.series}{lead.volumeNumber != null ? ` Â· Volume ${lead.volumeNumber}` : ''}
                </p>
              )}
              <h3 className="text-title mt-5">{lead.title}</h3>
              <p className="mt-3 text-mist">{lead.author}</p>
              <p className="mt-8 line-clamp-4 max-w-lg leading-relaxed text-moon/80">{lead.description}</p>
              <div className="mt-10 flex flex-wrap items-center gap-5">
                <span className="font-display text-2xl font-semibold tabular-nums">{formatPrice(lead.price)}</span>
                <AddToCartButton book={lead} compact />
                <WishlistButton book={lead} withLabel className="px-2" />
              </div>
              <Link to={`/view/${lead.id}/book`} className="nav-link mt-8 inline-flex min-h-11 items-center gap-3 text-sm font-semibold">
                Read more about this book <Arrow />
              </Link>
            </Reveal>
          </div>

          {/* The rest float at staggered heights. */}
          {rest.length > 0 && (
            <StaggeredReveal
              className="mt-24 grid grid-cols-2 gap-x-5 gap-y-14 sm:grid-cols-3 sm:gap-x-8 lg:mt-36 lg:grid-cols-6 lg:gap-x-10"
              itemClassName="lg:[&:nth-child(3n+2)]:mt-24 lg:[&:nth-child(3n)]:mt-10"
              variant="scale"
            >
              {rest.slice(0, 6).map((b) => (
                <BookCard key={b.id} book={b} sizes="(min-width: 1024px) 14vw, (min-width: 640px) 30vw, 45vw" />
              ))}
            </StaggeredReveal>
          )}
        </div>
      </Reveal>
    </section>
  )
}

// ---- Scenario 03 E + 06: series showcase -------------------------------------

function SeriesShowcase({ series }) {
  const multi = series.filter((s) => s.count > 1).slice(0, 3)
  if (!multi.length) return null
  return (
    <section aria-labelledby="series-title" className="shell section-y">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <Chapter>Series</Chapter>
          <TextReveal as="h2" id="series-title" lines={['Follow a story', 'volume by volume.']} className="text-headline mt-8" />
        </div>
        <Reveal delay={200} className="lg:col-span-4 lg:justify-self-end">
          <Link to="/series" className="nav-link inline-flex min-h-11 items-center gap-3 text-sm font-semibold">
            All {series.length} series <Arrow />
          </Link>
        </Reveal>
      </div>

      <div className="mt-20 divide-y divide-line border-y border-line lg:mt-28">
        {multi.map((s, row) => (
          <article key={s.name} className="grid gap-10 py-14 lg:grid-cols-12 lg:items-center lg:py-20">
            <Reveal className={`lg:col-span-5 ${row % 2 ? 'lg:order-2 lg:col-start-8' : ''}`}>
              <p className="eyebrow text-mist">{[s.category, `${s.count} volumes in stock`].filter(Boolean).join(' Â· ')}</p>
              <h3 className="text-title mt-5">{s.name}</h3>
              <p className="mt-3 text-mist">{s.author}</p>
              <Link
                to={`/series/${encodeURIComponent(s.name)}`}
                className="nav-link mt-8 inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-moon"
              >
                Explore the series <Arrow />
              </Link>
            </Reveal>
            <StaggeredReveal
              as="ol"
              itemAs="li"
              className={`flex gap-4 sm:gap-6 lg:col-span-6 ${row % 2 ? 'lg:order-1 lg:col-start-1' : 'lg:col-start-7 lg:justify-end'}`}
              itemClassName="w-[clamp(7.5rem,14vw,12.5rem)]"
              step={80}
              aria-label={`${s.name} volumes`}
            >
              {s.volumes.map((v) => (
                <Link key={v._id} to={`/view/${v._id}/book`} className="card-motion block">
                  <div className="card-frame card-cover card-lift overflow-hidden">
                    <BookCover book={v} sizes="14vw" />
                  </div>
                  <p className="mt-3 text-xs text-mist">{v.volumeNumber != null ? `Vol. ${v.volumeNumber}` : v.title}</p>
                </Link>
              ))}
            </StaggeredReveal>
          </article>
        ))}
      </div>
    </section>
  )
}

// ---- Scenario 11: collections by genre (typographic index) -------------------

function GenreIndex({ categories }) {
  if (!categories.length) return null
  return (
    <section aria-labelledby="genres-title" className="shell section-y pt-0">
      <div className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <Chapter>Collections</Chapter>
            <h2 id="genres-title" className="text-title mt-8">Browse the shelves.</h2>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-mist">Manga, light novels, artbooks, box sets and collector editions — counts are live from the catalogue.</p>
          </div>
        </div>
        <StaggeredReveal as="ul" itemAs="li" className="border-t border-line lg:col-span-7 lg:col-start-6" step={60} variant="fade">
          {categories.map((c, i) => (
            <Link
              key={c._id}
              to={`/all-books?genre=${encodeURIComponent(c.name)}`}
              className="group flex min-h-20 items-center gap-6 border-b border-line py-6"
            >
              <span className="eyebrow w-8 text-mist">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex-1 font-display text-[clamp(1.5rem,3.4vw,2.75rem)] font-bold tracking-tight text-moon/85 transition-[color,transform] duration-500 ease-(--ease-cinema) group-hover:translate-x-2 group-hover:text-moon">
                {c.name}
              </span>
              <span className="text-sm text-mist tabular-nums">{c.bookCount}</span>
              <Arrow className="text-electric opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100" />
            </Link>
          ))}
        </StaggeredReveal>
      </div>
    </section>
  )
}

// ---- Scenario 11: recently viewed (this browser only) ------------------------

function RecentlyViewed() {
  const [items] = useState(() => getRecentlyViewed())
  if (items.length < 2) return null
  return (
    <section aria-labelledby="recent-title" className="shell pb-[clamp(5rem,10vw,9rem)]">
      <div className="flex items-end justify-between gap-6 border-t border-line pt-10">
        <h2 id="recent-title" className="eyebrow text-mist">Recently viewed</h2>
      </div>
      <StaggeredReveal as="ul" itemAs="li" className="mt-8 flex gap-5 overflow-x-auto pb-4 [scrollbar-width:thin]" itemClassName="w-28 shrink-0 sm:w-32" step={60} variant="fade">
        {items.map((b) => (
          <Link key={b._id} to={`/view/${b._id}/book`} className="card-motion block">
            <div className="card-frame card-cover card-lift overflow-hidden">
              <BookCover book={b} sizes="128px" />
            </div>
            <p className="mt-3 line-clamp-2 text-xs text-mist">{b.title}</p>
          </Link>
        ))}
      </StaggeredReveal>
    </section>
  )
}

// ---- Scenario 13: final brand moment ----------------------------------------

function FinalMoment() {
  return (
    <section aria-labelledby="final-title" className="relative isolate overflow-hidden border-t border-line">
      <Atmosphere strong />
      <div className="shell section-y grid gap-16 lg:grid-cols-12 lg:items-end">
        <TextReveal as="h2" id="final-title" lines={['Read', 'beyond', 'reality.']} className="text-display lg:col-span-8" />
        <Reveal delay={400} className="lg:col-span-4 lg:pb-4">
          <p className="max-w-xs leading-relaxed text-mist">
            Find your next series, one carefully presented volume at a time.
          </p>
          <MagneticButton
            as={Link}
            to="/all-books"
            className="group mt-10 inline-flex min-h-14 items-center gap-5 border border-line px-8 font-semibold text-moon transition-colors hover:border-electric hover:text-electric"
          >
            Start browsing
            <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />
          </MagneticButton>
        </Reveal>
      </div>
    </section>
  )
}

// ---- Page --------------------------------------------------------------------

function Home() {
  const data = useHomeData()
  const ready = data.status === 'ready'

  const featured = ready ? data.featured : []

  return (
    <div className="overflow-x-clip">
      <Hero />

      {data.status === 'loading' && (
        <div className="shell section-y">
          <LineSkeleton className="w-40" />
          <div className="skeleton mt-8 h-24 w-full max-w-2xl" />
          <GridSkeleton count={4} className="mt-20 grid grid-cols-2 gap-x-5 gap-y-14 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-12" />
        </div>
      )}

      {data.status === 'error' && (
        <section className="shell section-y" role="alert">
          <h2 className="text-title">The catalogue is unavailable right now.</h2>
          <p className="mt-4 max-w-md text-mist">{data.message || 'Please check your connection and try again.'}</p>
          <button type="button" onClick={data.retry} className="mt-8 min-h-12 border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">
            Try again
          </button>
        </section>
      )}

      {ready && (
        <>
          <NewArrivals books={data.newest} />
          <BlogJournal />
          <FeaturedCollection books={featured} />
          <SeriesShowcase series={data.series} />
          <GenreIndex categories={data.categories} />
          <RecentlyViewed />
        </>
      )}

      <FinalMoment />
    </div>
  )
}

export default Home
