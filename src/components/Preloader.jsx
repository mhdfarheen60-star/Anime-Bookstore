import Wordmark from './Wordmark'

/**
 * CinematicLoader: shown only while a page's code chunk or the session check is
 * loading (typically a fraction of a second). Pure CSS: a calm dark field, the
 * brand mark, and a thin light sweeping across a hairline. It never delays a
 * page that's already available.
 */
function Preloader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-ink text-moon" role="status" aria-label="Loading">
      <Wordmark className="arrive-rise" style={{ "--d": "0ms" }} />
      <div aria-hidden="true" className="relative h-px w-40 overflow-hidden bg-line">
        <span className="loader-line absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-electric to-transparent" />
      </div>
    </div>
  )
}

export default Preloader
