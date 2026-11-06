import { Link } from 'react-router-dom'
import ContentPage from '../components/ContentPage'

function Guides() {
  return (
    <div>
      <ContentPage
        eyebrow="Journal"
        title="Reading Guides"
        lede="Short, practical guides to the store itself: how to find a volume, read a book page, build a wishlist and follow an order."
        breadcrumb={{ to: '/blog', label: 'Journal' }}
        sections={[
          {
            id: 'next-volume',
            heading: 'Finding the next volume',
            paragraphs: [
              'Every title in the store is a single volume, so the fastest way to continue a series is to open the series rather than search for a title you half-remember.',
            ],
            bullets: [
              'Open any book in the series and follow the series link in the details panel — it lists every volume the store stocks, in reading order.',
              'The Series page in the footer collects every series the store currently sells.',
              'Use the search field on the All Books page if you know the author or part of the title; it matches titles, authors and series names.',
              'Volume numbers are shown on each card, so you can see at a glance whether a shelf is complete.',
            ],
          },
          {
            id: 'book-page',
            heading: 'Reading a book page',
            paragraphs: [
              'Each book page describes one exact edition, which is what makes it possible to order the same volume twice and get the same book.',
            ],
            bullets: [
              'Publisher and published year tell you which edition you are looking at.',
              'The ISBN identifies that exact printing, so a reprint with a new ISBN is a separate entry.',
              'Language is the language of the printed edition.',
              'A struck-through price is the original price of the edition; the price next to it is what you pay.',
              'Availability is the live stock count for that volume.',
            ],
          },
          {
            id: 'wishlist',
            heading: 'Building a wishlist',
            paragraphs: [
              'The wishlist is the shelf you come back to. It is tied to your account, so it survives signing out and follows you to another device.',
            ],
            bullets: [
              'Tap the heart on any book card or book page to save a title.',
              'Open Wishlist from the header to see everything you have saved.',
              'Saved titles can be added to the cart in one step when you are ready to buy.',
              'Removing a title from the wishlist never affects an order you have already placed.',
            ],
          },
          {
            id: 'orders',
            heading: 'Following an order',
            paragraphs: [
              'Every order gets its own record in your account, and that record is the live source of truth for where the parcel is.',
            ],
            bullets: [
              'Placed — the order exists and is waiting for the store to confirm it.',
              'Confirmed — the store has accepted the order.',
              'Processing — the order is being prepared.',
              'Shipped — the parcel has left the store.',
              'Delivered — the order is complete.',
              'Open the order under “My Orders” and choose “View Details” – you can cancel it there while it is pending or confirmed. After that, contact the store.',
            ],
          },
        ]}
      >
        <div className="mt-10 flex flex-wrap gap-4 border-t border-line pt-10">
          <Link to="/faq" className="inline-flex min-h-12 items-center border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">
            Frequently asked questions
          </Link>
          <Link to="/blog" className="inline-flex min-h-12 items-center bg-sakura px-6 font-semibold text-white transition-colors hover:bg-[#2563EB]">
            Read the journal
          </Link>
        </div>
      </ContentPage>
    </div>
  )
}

export default Guides
