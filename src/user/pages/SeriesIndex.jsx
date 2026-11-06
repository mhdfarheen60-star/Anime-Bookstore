import { Link } from 'react-router-dom'
import { StaggeredReveal, TextReveal } from '../../motion/Reveal'
import BookCover from '../components/BookCover'
import { LineSkeleton } from '../components/Skeletons'
import { useSeries } from './useSeries'

function SeriesIndex() {
  const { status, series, message, retry } = useSeries()

  return (
    <div>
      <header className="shell pt-[clamp(3rem,8vw,7rem)] pb-[clamp(3rem,6vw,5rem)]">
        <p className="eyebrow text-mist"><span className="text-electric">(Series)</span> — Every story we stock</p>
        <TextReveal as="h1" lines={['Pick a world.', 'Start reading.']} className="text-headline mt-8" />
        <p className="mt-8 max-w-md text-mist">Series with more than one volume in stock are listed first. Only volumes we actually stock are shown.</p>
      </header>

      <section aria-label="All series" className="shell pb-[clamp(5rem,10vw,9rem)]">
        {status === 'loading' && (
          <div role="status" aria-label="Loading series" className="border-t border-line">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-8 border-b border-line py-8">
                <div className="flex-1 space-y-3"><div className="skeleton h-9 w-2/3 max-w-md" /><LineSkeleton className="w-40" /></div>
                <div className="skeleton aspect-2/3 w-16" />
              </div>
            ))}
          </div>
        )}

        {status === 'error' && (
          <div role="alert">
            <p className="text-mist">The series list couldn’t be loaded ({message}).</p>
            <button type="button" onClick={retry} className="mt-6 min-h-12 border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">Try again</button>
          </div>
        )}

        {status === 'ready' && series.length === 0 && (
          <div className="border-t border-line py-16 text-center">
            <p className="text-mist">There are no series in the catalogue yet.</p>
            <Link to="/all-books" className="mt-6 inline-block min-h-12 border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">
              Browse all books
            </Link>
          </div>
        )}

        {status === 'ready' && series.length > 0 && (
          <StaggeredReveal as="ul" itemAs="li" className="border-t border-line" step={50} variant="fade">
            {series.map((s) => (
              <Link
                key={s.name}
                to={`/series/${encodeURIComponent(s.name)}`}
                className="group grid grid-cols-[1fr_auto] items-center gap-6 border-b border-line py-8 sm:gap-10"
              >
                <div className="min-w-0">
                  <h2 className="font-display text-[clamp(1.6rem,4vw,3.25rem)] leading-tight font-bold tracking-tight text-moon/85 transition-[color,transform] duration-500 ease-(--ease-cinema) group-hover:translate-x-2 group-hover:text-moon">
                    {s.name}
                  </h2>
                  <p className="mt-2 text-sm text-mist">
                    {[s.author, s.category, `${s.count} ${s.count === 1 ? 'volume' : 'volumes'}`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex -space-x-6" aria-hidden="true">
                  {s.volumes.slice(0, 3).map((v, i) => (
                    <div
                      key={v._id}
                      className="w-14 shadow-lg shadow-black/10 transition-transform duration-500 ease-(--ease-cinema) group-hover:translate-x-[calc(var(--i)*6px)] sm:w-16"
                      style={{ '--i': i, zIndex: 3 - i }}
                    >
                      <BookCover book={v} sizes="64px" />
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </StaggeredReveal>
        )}
      </section>
    </div>
  )
}

export default SeriesIndex
