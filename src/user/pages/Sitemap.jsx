import { Link } from 'react-router-dom'
import ContentPage from '../components/ContentPage'

// Only real, public destinations. Admin screens, API paths and anything that
// needs an account to see personal data are deliberately left out.
const SECTIONS = [
  {
    title: 'Shop',
    links: [
      { to: '/', label: 'Home', hint: 'The front of the store' },
      { to: '/all-books', label: 'All Books', hint: 'Every volume, searchable and sortable' },
      { to: '/series', label: 'Series', hint: 'Browse by series, in reading order' },
      { to: '/authors', label: 'Author Spotlights', hint: 'The creators on the shelf' },
      { to: '/all-books?sort=newest', label: 'New Arrivals', hint: 'The most recently added titles' },
      { to: '/all-books?featured=1', label: 'Featured Titles', hint: 'The store’s hand-picked shelf' },
    ],
  },
  {
    title: 'Journal',
    links: [
      { to: '/blog', label: 'Blog', hint: 'Articles, guides and release notes' },
      { to: '/guides', label: 'Reading Guides', hint: 'How to use the catalogue and your account' },
    ],
  },
  {
    title: 'Your account',
    links: [
      { to: '/profile', label: 'My Account', hint: 'Profile, wishlist, listings and orders' },
      { to: '/profile?tab=history', label: 'Track My Order', hint: 'Order history and live status' },
      { to: '/wishlist', label: 'Wishlist', hint: 'Titles you have saved' },
      { to: '/cart', label: 'Cart', hint: 'Checkout and order summary' },
      { to: '/login', label: 'Sign in', hint: 'Sign in or create an account' },
    ],
  },
  {
    title: 'Customer care',
    links: [
      { to: '/contact', label: 'Contact Us', hint: 'Send the store a message' },
      { to: '/faq', label: 'Frequently Asked Questions', hint: 'Answers about orders, shipping and editions' },
      { to: '/shipping-returns', label: 'Shipping & Returns', hint: 'Delivery cost, dispatch and returns' },
    ],
  },
  {
    title: 'Company & policies',
    links: [
      { to: '/about', label: 'About Us', hint: 'What the store is and how it works' },
      { to: '/privacy', label: 'Privacy Policy', hint: 'What is collected and why' },
      { to: '/terms', label: 'Terms & Conditions', hint: 'The rules for using the store' },
      { to: '/refund-policy', label: 'Refund Policy', hint: 'How a refund is agreed and recorded' },
      { to: '/sitemap', label: 'Sitemap', hint: 'Every public page on this site' },
    ],
  },
]

function Sitemap() {
  return (
    <div>
      <ContentPage
        eyebrow="Company"
        title="Sitemap"
        lede="Every public page on Book Store. Admin screens and internal endpoints are not listed."
        breadcrumb={{ to: '/about', label: 'About Us' }}
      >
        <div className="mt-14 grid gap-x-12 gap-y-14 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-lg font-bold tracking-tight text-moon">{section.title}</h2>
              <ul className="mt-6 space-y-4">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="group block">
                      <span className="inline-flex items-center gap-2 text-base font-semibold text-moon transition-colors group-hover:text-electric">
                        {link.label}
                        <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                      </span>
                      <span className="mt-1 block text-sm text-mist">{link.hint}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </ContentPage>
    </div>
  )
}

export default Sitemap
