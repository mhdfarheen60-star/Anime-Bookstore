import { Link } from 'react-router-dom'
import Wordmark from '../components/Wordmark'

// A restrained "missing page" treatment: a stack of page edges with the store's
// seal, plus the editorial 404 headline.
function PageStack() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-64 w-40 sm:h-80 sm:w-52">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-x-0 border border-line bg-panel shadow-sm"
          style={{
            top: `${i * 14}px`,
            height: '78%',
            transform: `rotate(${(i - 1) * 2.5}deg)`,
            opacity: 1 - i * 0.22,
          }}
        />
      ))}
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-jp text-6xl leading-none text-electric/80 sm:text-7xl">本</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-electric/60 to-transparent" />
    </div>
  )
}

function Pnf() {
  return (
    <div className="surface-dark flex min-h-screen flex-col bg-ink text-moon">
      <header className="shell flex items-center justify-between py-8">
        <Link to="/" aria-label="Book Store home"><Wordmark /></Link>
      </header>

      <main className="shell flex flex-1 flex-col items-center justify-center py-[clamp(3rem,8vw,7rem)] text-center">
        <p className="arrive-fade font-display text-[clamp(6rem,22vw,14rem)] font-extrabold leading-[0.8] tracking-[-0.06em] text-moon/[0.06]" aria-hidden="true">
          404
        </p>

        <div className="mt-6">
          <PageStack />
        </div>

        <h1 className="arrive-rise mt-12 font-display text-[clamp(1.6rem,4.5vw,3rem)] font-bold uppercase leading-tight tracking-[0.08em]">
          This chapter is missing.
        </h1>

        <p className="arrive-rise mt-6 max-w-md leading-relaxed text-mist" style={{ '--d': '160ms' }}>
          The page you’re looking for couldn’t be found. Let’s get you back to the shelf.
        </p>

        <div className="arrive-rise mt-12 flex flex-col items-center gap-4 sm:flex-row" style={{ '--d': '280ms' }}>
          <Link to="/" className="inline-flex min-h-12 w-full items-center justify-center bg-sakura px-8 font-semibold text-white transition-colors hover:bg-[#2563EB] sm:w-auto">
            Return Home
          </Link>
          <Link to="/all-books" className="inline-flex min-h-12 w-full items-center justify-center border border-line px-8 font-semibold transition-colors hover:border-electric hover:text-electric sm:w-auto">
            Explore Books
          </Link>
          <Link to="/series" className="inline-flex min-h-12 w-full items-center justify-center border border-line px-8 font-semibold transition-colors hover:border-electric hover:text-electric sm:w-auto">
            Browse Series
          </Link>
        </div>

        <p className="arrive-rise mt-14 text-sm text-mist" style={{ '--d': '380ms' }}>
          Looking for something specific?{' '}
          <Link to="/all-books" className="text-moon underline decoration-electric/60 underline-offset-4 transition-colors hover:text-electric">
            Search the catalogue
          </Link>
        </p>
      </main>
    </div>
  )
}

export default Pnf
