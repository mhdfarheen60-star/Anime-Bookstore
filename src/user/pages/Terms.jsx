import { Link } from 'react-router-dom'
import ContentPage from '../components/ContentPage'

function Terms() {
  return (
    <div>
      <ContentPage
        eyebrow="Policies"
        title="Terms & Conditions"
        lede="The rules that apply when you use the store and place an order."
        breadcrumb={{ to: '/sitemap', label: 'Sitemap' }}
        sections={[
          {
            id: 'draft',
            heading: 'Status of this document',
            paragraphs: [
              'This is a working draft written from how the store’s systems actually behave. It has not been reviewed by a lawyer and is not yet a final legal notice.',
            ],
            note: 'Marked for review by the business owner and legal counsel before it is treated as the published terms.',
          },
          {
            id: 'account',
            heading: 'Your account',
            bullets: [
              'You need an account to order, and the account must be registered with accurate details.',
              'You are responsible for keeping your password safe and for everything that happens under your account.',
              'Accounts used for abuse, fraud or resale may be deactivated by the store.',
            ],
          },
          {
            id: 'orders',
            heading: 'Orders and prices',
            paragraphs: [
              'All prices are shown in US dollars and include the tax and shipping shown in the cart summary, so the total you see at checkout is the total you are charged.',
              'An order is only accepted once the store has confirmed it. If a title turns out to be unavailable after you place the order, the store will contact you and the order can be cancelled from your account.',
            ],
          },
          {
            id: 'availability',
            heading: 'Catalogue and stock',
            paragraphs: [
              'The catalogue lists the exact volume being sold, with its publisher, ISBN and language. Cover artwork is publisher artwork sourced through Open Library, or an image supplied by the store.',
              'Stock is tracked per volume and can change while you are browsing. If a title sells out after you have added it to your cart, the quantity is adjusted and the order is confirmed only for what is actually available.',
            ],
          },
          {
            id: 'conduct',
            heading: 'Acceptable use',
            paragraphs: [
              'Do not attempt to disrupt the store, probe it without permission, or use it to resell stock outside the store’s own terms.',
            ],
          },
          {
            id: 'liability',
            heading: 'Liability',
            paragraphs: [
              'The store provides the site and the books as described. To the extent the law allows, the store is not responsible for indirect losses that were not foreseeable when an order was placed.',
            ],
            note: 'The governing law, jurisdiction and any liability caps have not been confirmed by the store and must be completed by legal counsel before publication.',
          },
          {
            id: 'changes',
            heading: 'Changes to these terms',
            paragraphs: [
              'These terms may change as the store changes. The version published on this page is the version that applies.',
            ],
          },
        ]}
      >
        <div className="mt-10 border-t border-line pt-10">
          <p className="text-mist">
            See also the{' '}
            <Link to="/privacy" className="text-moon underline decoration-electric/60 underline-offset-4 transition-colors hover:text-electric">
              Privacy Policy
            </Link>{' '}
            and the{' '}
            <Link to="/refund-policy" className="text-moon underline decoration-electric/60 underline-offset-4 transition-colors hover:text-electric">
              Refund Policy
            </Link>
            .
          </p>
        </div>
      </ContentPage>
    </div>
  )
}

export default Terms
