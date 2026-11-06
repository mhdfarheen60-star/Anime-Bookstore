import { Link } from 'react-router-dom'
import ContentPage from '../components/ContentPage'

function Refund() {
  return (
    <div>
      <ContentPage
        eyebrow="Policies"
        title="Refund Policy"
        lede="How the store handles a refund when one is agreed."
        breadcrumb={{ to: '/sitemap', label: 'Sitemap' }}
        sections={[
          {
            id: 'draft',
            heading: 'Status of this document',
            paragraphs: [
              'This is a working draft written from how the store’s systems actually behave. It has not been reviewed by a lawyer and is not yet a final legal notice.',
            ],
            note: 'Marked for review by the business owner and legal counsel before it is treated as the published policy.',
          },
          {
            id: 'how',
            heading: 'How a refund is handled',
            paragraphs: [
              'Refunds are agreed case by case with the store team. There is no self-service refund button on the site, because a refund has to be matched to how the order was actually paid for.',
              'Once a refund is agreed, the store records it against the order: the order’s payment status is marked as refunded in the store dashboard, and the refund is then processed outside the website.',
            ],
            note: 'The store’s payment provider, refund window and the exact timeline for money reaching the customer have not been confirmed and must be completed before publication.',
          },
          {
            id: 'when',
            heading: 'When a refund applies',
            paragraphs: [
              'A damaged or incorrect book, or an order that the store cannot fulfil, are the cases the team can act on. Send the order number and, for damage, a photo, through the contact page.',
            ],
          },
          {
            id: 'shipping',
            heading: 'Shipping and returns',
            paragraphs: [
              'Shipping charges are part of the order total and are not refunded simply because an order was returned. Whether the store covers return shipping in a particular case is decided by the team.',
            ],
            note: 'The return window and the conditions under which return shipping is paid by the store are still to be confirmed by the business owner.',
          },
          {
            id: 'status',
            heading: 'Where to see the status',
            paragraphs: [
              'Your account keeps the order record and its current status. If a refund has been recorded, the store will confirm it with you directly.',
            ],
          },
        ]}
      >
        <div className="mt-10 border-t border-line pt-10">
          <p className="text-mist">
            To start a refund,{' '}
            <Link to="/contact" className="text-moon underline decoration-electric/60 underline-offset-4 transition-colors hover:text-electric">
              send the store your order number
            </Link>
            . You can also read the{' '}
            <Link to="/shipping-returns" className="text-moon underline decoration-electric/60 underline-offset-4 transition-colors hover:text-electric">
              Shipping & Returns
            </Link>{' '}
            page.
          </p>
        </div>
      </ContentPage>
    </div>
  )
}

export default Refund
