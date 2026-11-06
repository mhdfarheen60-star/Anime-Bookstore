import { Link, useParams } from 'react-router-dom'
import { transformBook } from '../../data/books'
import { Reveal, StaggeredReveal, TextReveal } from '../../motion/Reveal'
import BookCard from '../components/BookCard'
import BookCover from '../components/BookCover'
import { GridSkeleton } from '../components/Skeletons'
import { missingVolumes, useSeries } from './useSeries'

/** Scenario 06: one series as a connected collection, built only from stocked volumes. */
function Series() {
  const { name } = useParams()
  const { status, series, message, retry } = useSeries()
  const current = series.find((s) => s.name === name)

  if (status === 'loading') {
    return (
      <div className="shell py-[clamp(3rem,8vw,7rem)]">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-8 h-24 w-full max-w-3xl" />
        <GridSkeleton count={4} className="mt-20 grid grid-cols-2 gap-x-6 gap-y-14 lg:grid-cols-4 lg:gap-x-12" />
      </div>
    )
  }

  if (status === 'error' || !current) {
    return (
      <section className="shell py-[clamp(5rem,12vw,10rem)]" role="alert">
        <h1 className="text-headline">{status === 'error' ? 'This series couldn’t be loaded.' : 'We don’t stock that series.'}</h1>
        <p className="mt-6 max-w-md text-mist">{status === 'error' ? message : 'It may have sold out or been removed.'}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          {status === 'error' && <button type="button" onClick={retry} className="min-h-12 border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">Try again</button>}
          <Link to="/series" className="inline-flex min-h-12 items-center bg-sakura px-6 font-semibold text-white transition-colors hover:bg-[#2563EB]">All series</Link>
        </div>
      </section>
    )
  }

  const volumes = current.volumes.map((v) => transformBook({ ...v, series: current.name }))
  const numbered = volumes.every((v) => Number.isInteger(v.volumeNumber))
  const gaps = missingVolumes(volumes)
  const related = series.filter((s) => s.name !== current.name && s.category && s.category === current.category).slice(0, 4)

  return (
    <div>
      <header className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="arrive-atmos absolute -top-1/2 right-0 -z-10 h-[90vmax] w-[90vmax] rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.10),transparent)]" />
        <div className="shell pt-[clamp(3rem,8vw,7rem)] pb-[clamp(3.5rem,7vw,6rem)]">
          <nav aria-label="Breadcrumb" className="eyebrow flex items-center gap-3 text-mist">
            <Link to="/series" className="inline-flex min-h-11 items-center hover:text-moon">Series</Link>
            {current.category && <><span aria-hidden="true">/</span><span>{current.category}</span></>}
          </nav>
          <TextReveal as="h1" arrive lines={[current.name]} className="text-display mt-10 break-words" />
          <div className="arrive-rise mt-10 flex flex-wrap gap-x-12 gap-y-4 text-sm" style={{ '--d': '500ms' }}>
            <p><span className="text-mist">By </span>{current.author}</p>
            <p><span className="text-mist">In stock </span>{current.count} {current.count === 1 ? 'volume' : 'volumes'}</p>
          </div>
        </div>
      </header>

      <section aria-labelledby="volumes-title" className="shell border-t border-line py-[clamp(4rem,8vw,7rem)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="volumes-title" className="eyebrow text-mist">{numbered ? 'Reading order' : 'Volumes'}</h2>
          {gaps.length > 0 && (
            <p className="text-sm text-mist">Not currently stocked: {gaps.map((n) => `Vol. ${n}`).join(', ')}</p>
          )}
        </div>
        <StaggeredReveal as="ol" itemAs="li" className="mt-14 grid grid-cols-2 gap-x-6 gap-y-16 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-12" step={120} variant="scale">
          {volumes.map((v) => (
            <div key={v.id}>
              {numbered && (
                <p aria-hidden="true" className="mb-4 font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-none font-extrabold text-transparent [-webkit-text-stroke:1px_rgba(17,19,24,0.18)]">
                  {String(v.volumeNumber).padStart(2, '0')}
                </p>
              )}
              <BookCard book={v} sizes="(min-width: 1024px) 20vw, 45vw" />
            </div>
          ))}
        </StaggeredReveal>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-series" className="border-t border-line bg-panel">
          <div className="shell py-[clamp(4rem,8vw,7rem)]">
            <Reveal>
              <p className="eyebrow text-mist">Also in {current.category}</p>
              <h2 id="related-series" className="text-title mt-5">Related series</h2>
            </Reveal>
            <StaggeredReveal as="ul" itemAs="li" className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" step={90}>
              {related.map((s) => (
                <Link key={s.name} to={`/series/${encodeURIComponent(s.name)}`} className="card-motion group flex items-center gap-5 rounded-lg border border-line bg-panel p-4 transition-colors hover:border-electric/40">
                  <div className="card-cover w-16 shrink-0 overflow-hidden"><BookCover book={s.volumes[0]} sizes="64px" /></div>
                  <div className="min-w-0">
                    <p className="truncate font-display font-semibold text-moon">{s.name}</p>
                    <p className="mt-1 text-xs text-mist">{s.count} {s.count === 1 ? 'volume' : 'volumes'}</p>
                  </div>
                </Link>
              ))}
            </StaggeredReveal>
          </div>
        </section>
      )}
    </div>
  )
}

export default Series
