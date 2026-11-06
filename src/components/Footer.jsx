import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFacebook, faInstagram, faXTwitter, faLinkedinIn } from '@fortawesome/free-brands-svg-icons'
import Wordmark from './Wordmark'
import { api } from '../api/client'

// Genres are read from the live catalogue so every link points at a shelf that
// actually exists. The request is cached for the session.
let genreRequest = null
const loadGenres = () => {
  if (!genreRequest) {
    genreRequest = api
      .getCategories()
      .then((res) => (res.data?.categories ?? []).filter((c) => c.bookCount > 0).slice(0, 5))
      .catch(() => [])
  }
  return genreRequest
}

const EXPLORE = [
  { name: 'All Books', to: '/all-books' },
  { name: 'Series', to: '/series' },
  { name: 'New Arrivals', to: '/all-books?sort=newest' },
  { name: 'Featured Titles', to: '/all-books?featured=1' },
]

const DISCOVER = [
  { name: 'Blog', to: '/blog' },
  { name: 'Reading Guides', to: '/guides' },
  { name: 'Author Spotlights', to: '/authors' },
  { name: 'Latest Releases', to: '/all-books?sort=newest' },
  { name: 'Featured Collections', to: '/all-books?featured=1' },
]

const CARE = [
  { name: 'Contact Us', to: '/contact' },
  { name: 'Frequently Asked Questions', to: '/faq' },
  { name: 'Shipping & Returns', to: '/shipping-returns' },
  { name: 'Track My Order', to: '/profile?tab=history' },
  { name: 'My Account', to: '/profile' },
  { name: 'Wishlist', to: '/wishlist' },
]

const COMPANY = [
  { name: 'About Us', to: '/about' },
  { name: 'Privacy Policy', to: '/privacy' },
  { name: 'Terms & Conditions', to: '/terms' },
  { name: 'Refund Policy', to: '/refund-policy' },
  { name: 'Sitemap', to: '/sitemap' },
]

// The store's real profiles are not set up yet, so these are shown as
// unavailable rather than linking to a page that does not exist.
const SOCIALS = [
  { icon: faInstagram, label: 'Instagram' },
  { icon: faXTwitter, label: 'X' },
  { icon: faFacebook, label: 'Facebook' },
  { icon: faLinkedinIn, label: 'LinkedIn' },
]

const linkClass = 'inline-flex min-h-10 items-center text-sm text-moon/80 transition-colors duration-300 hover:text-moon'

function FooterColumn({ title, children, className = '' }) {
  return (
    <nav aria-label={title} className={className}>
      <h2 className="eyebrow text-mist">{title}</h2>
      <ul className="mt-5 space-y-1">{children}</ul>
    </nav>
  )
}

function Footer() {
  const [genres, setGenres] = useState([])

  useEffect(() => {
    let cancelled = false
    loadGenres().then((list) => {
      if (!cancelled) setGenres(list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <footer className="border-t border-line bg-ink text-moon">
      {/* Newsletter band. There is no mailing-list service behind the store
          yet, so no email field is shown: a form that silently discards an
          address would be worse than none. */}
      <section aria-labelledby="newsletter-heading" className="border-b border-line">
        <div className="shell grid gap-8 py-12 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-14">
          <div className="lg:col-span-6">
            <h2 id="newsletter-heading" className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              Stay in the loop
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-mist">
              The next chapter starts here. Discover new volumes, upcoming releases, and collector editions worth keeping.
            </p>
          </div>
          <div className="flex flex-col gap-4 lg:col-span-6 lg:items-end">
            <div className="flex flex-wrap gap-3">
              <Link to="/blog" className="inline-flex min-h-12 items-center bg-sakura px-6 font-semibold text-white transition-colors hover:bg-[#2563EB]">
                Join the reading list →
              </Link>
              <Link to="/contact" className="inline-flex min-h-12 items-center border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">
                Get in touch
              </Link>
            </div>
            <p className="text-xs leading-relaxed text-mist lg:text-right">
              Email subscriptions are not switched on yet — the journal and the contact form are the live channels today.
            </p>
          </div>
        </div>
      </section>

      <div className="shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-14">
        {/* Column 1 — the brand */}
        <div className="lg:col-span-4">
          <Link to="/" aria-label="Book Store home"><Wordmark /></Link>
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-mist">
            Manga, light novels and collector editions, each shown with the cover of the exact volume you receive.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {SOCIALS.map(({ icon, label }) => (
              <li key={label}>
                <span
                  aria-disabled="true"
                  title={`${label} profile not set up yet`}
                  className="grid h-11 w-11 cursor-not-allowed place-items-center text-mist/50"
                >
                  <FontAwesomeIcon icon={icon} />
                  <span className="sr-only">{label} (not available yet)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2 — explore */}
        <FooterColumn title="Explore" className="lg:col-span-2">
          {EXPLORE.map((l) => (
            <li key={l.to}><Link to={l.to} className={linkClass}>{l.name}</Link></li>
          ))}
          {genres.length > 0 && (
            <>
              <li className="pt-4">
                <span className="eyebrow text-mist/70">By genre</span>
              </li>
              {genres.map((g) => (
                <li key={g.slug}>
                  <Link to={`/all-books?genre=${encodeURIComponent(g.name)}`} className={linkClass}>{g.name}</Link>
                </li>
              ))}
            </>
          )}
        </FooterColumn>

        {/* Column 3 — discover */}
        <FooterColumn title="Discover" className="lg:col-span-2">
          {DISCOVER.map((l) => (
            <li key={l.to}><Link to={l.to} className={linkClass}>{l.name}</Link></li>
          ))}
        </FooterColumn>

        {/* Column 4 — customer care */}
        <FooterColumn title="Customer Care" className="lg:col-span-2">
          {CARE.map((l) => (
            <li key={l.to}><Link to={l.to} className={linkClass}>{l.name}</Link></li>
          ))}
        </FooterColumn>

        {/* Column 5 — company & policies */}
        <FooterColumn title="Company & Policies" className="lg:col-span-2">
          {COMPANY.map((l) => (
            <li key={l.to}><Link to={l.to} className={linkClass}>{l.name}</Link></li>
          ))}
        </FooterColumn>
      </div>

      <div className="shell flex flex-col gap-2 border-t border-line py-5 text-xs text-mist sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Book Store. All rights reserved.</p>
        <p>Cover images: publisher artwork via Open Library, or supplied by the store.</p>
      </div>
    </footer>
  )
}

export default Footer
