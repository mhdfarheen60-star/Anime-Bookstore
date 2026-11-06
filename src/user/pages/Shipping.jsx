import { Link } from 'react-router-dom'
import ContentPage from '../components/ContentPage'

function Shipping() {
  return (
    <div>
      <ContentPage
        eyebrow="Customer care"
        title="Shipping & Returns"
        lede="How the store ships an order, what it costs, and what happens if something is not right."
        breadcrumb={{ to: '/faq', label: 'FAQ' }}
        sections={[
          {
            id: 'cost',
            heading: 'What shipping costs',
            paragraphs: [
              'Shipping is a flat $50 on every order. There is no shipping charge at all when the subtotal of your order is over $500 — the cart shows how much more is needed to reach free shipping.',
              'Tax of 10% is added to the subtotal. The cart summary always shows the subtotal, the shipping fee, the tax and the final total before you place the order, so the price you agree to is the price you see.',
            ],
            note: 'The figures above are the ones the checkout currently applies. If the store changes them, this page needs to be updated to match.',
          },
          {
            id: 'address',
            heading: 'The address we ship to',
            paragraphs: [
              'Checkout collects your name, phone number, street, city, state, ZIP code and country. The order is dispatched to the address entered at checkout, so please check the details — especially the phone number, which the courier may need.',
            ],
          },
          {
            id: 'dispatch',
            heading: 'How an order moves',
            paragraphs: [
              'Every order starts as placed. The store team confirms it, then moves it through processing and shipped before it is marked delivered. You can follow each step from your account, under “Order history”.',
            ],
            note: 'The site does not publish a delivery window, and the store has not confirmed one yet. The order status is the live source of truth for where a parcel is.',
          },
          {
            id: 'cancellation',
            heading: 'Cancelling an order',
            paragraphs: [
              'You can cancel an order yourself from your account while it is pending or confirmed. After that point the order has entered processing, so contact the store instead and the team will see what is possible.',
            ],
          },
          {
            id: 'returns',
            heading: 'Returns',
            paragraphs: [
              'There is no self-service return request on the site yet. To return something, send the store your order number and the reason for the return, and the team will confirm what can be arranged for that order.',
              'If a book arrives damaged, a photo of the damage plus your order number is the fastest route to a decision.',
            ],
            note: 'The return window, the condition rules and who pays the return shipping have not been confirmed by the store yet. They are marked here for review rather than guessed at.',
          },
        ]}
      >
        <div className="mt-10 flex flex-wrap gap-4 border-t border-line pt-10">
          <Link to="/faq" className="inline-flex min-h-12 items-center border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">
            Read the FAQ
          </Link>
          <Link to="/contact" className="inline-flex min-h-12 items-center bg-sakura px-6 font-semibold text-white transition-colors hover:bg-[#2563EB]">
            Contact the store
          </Link>
        </div>
      </ContentPage>
    </div>
  )
}

export default Shipping
