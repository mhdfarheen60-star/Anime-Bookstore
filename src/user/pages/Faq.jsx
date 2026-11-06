import { useState } from 'react'
import { Link } from 'react-router-dom'
import ContentPage from '../components/ContentPage'

// Every answer describes functionality that actually exists in the store
// today. Where the store has not confirmed a policy yet, the answer says so
// instead of guessing.
const GROUPS = [
  {
    id: 'orders-payments',
    label: 'Orders & Payments',
    items: [
      {
        q: 'How do I place an order?',
        a: 'Add a title to your cart, open the cart from the header, fill in the shipping address, and choose how to pay. The order is created immediately and appears in your account under “My Orders”.',
      },
      {
        q: 'Which payment methods can I use?',
        a: 'Three options: Cash on Delivery, Razorpay (card, UPI, netbanking, wallet) and Stripe Checkout (card). The correct amount is always computed on the server from your cart — never trusted from the browser.',
      },
      {
        q: 'When am I charged?',
        a: 'With Cash on Delivery you pay the courier on delivery. With Razorpay or Stripe you are charged when the payment succeeds; the order is recorded as paid only after signature verification server-side.',
      },
      {
        q: 'Can I change or cancel an order?',
        a: 'Yes. Open the order under “My Orders” and select “View Details” – you can cancel it there while it is pending or confirmed. Once it moves to processing or shipped, contact the store and the team will look at what can be done.',
      },
      {
        q: 'Where can I see my orders?',
        a: 'Open My Account → “Purchase History” (or “My Orders” for the latest three). Each order shows its number, the items and quantities, the totals, the shipping address and the current status and payment status.',
      },
    ],
  },
  {
    id: 'shipping-delivery',
    label: 'Shipping & Delivery',
    items: [
      {
        q: 'How much is shipping?',
        a: 'Shipping is a flat $50. It is free on orders whose subtotal is over $500. The exact figures are always shown in the cart summary before you check out.',
      },
      {
        q: 'Is there tax on top?',
        a: 'Yes. A 10% tax is calculated on the subtotal and shown as a separate line in the cart summary, together with shipping and the final total.',
      },
      {
        q: 'What address should I give?',
        a: 'Checkout asks for your name, phone number, street, city, state, ZIP code and country. The order ships to the address exactly as you enter it, so please double-check it before placing the order.',
      },
      {
        q: 'How long does delivery take?',
        a: 'The site does not publish a fixed delivery window, and the store has not yet confirmed one. You can follow the order status in your account: it moves from pending to confirmed, processing, shipped and finally delivered.',
      },
    ],
  },
  {
    id: 'returns-refunds',
    label: 'Returns & Refunds',
    items: [
      {
        q: 'Can I return a book?',
        a: 'There is no self-service return flow on the site yet. Contact the store with your order number and the reason for the return, and the team will confirm what can be arranged for that order.',
      },
      {
        q: 'How long does a refund take?',
        a: 'Refunds are recorded against the order by the store team. The timeline for a refund has not been published yet — the store will confirm the details for your order directly.',
      },
      {
        q: 'What if a book arrives damaged?',
        a: 'Send a photo of the damage along with your order number to the store and the team will take it from there.',
      },
    ],
  },
  {
    id: 'accounts-wishlist',
    label: 'Accounts & Wishlist',
    items: [
      {
        q: 'Do I need an account to order?',
        a: 'Yes. The cart, the wishlist and your order history all live in your account, which keeps your details and your order records in one place.',
      },
      {
        q: 'Can I sign in with Google?',
        a: 'Yes. On the sign-in and sign-up screens there is a “Continue with Google” option. The store still uses a password for changing your email address or password later.',
      },
      {
        q: 'How do I change my details?',
        a: 'Open My Account and use the profile form to change your name, username, email address, bio or avatar. Passwords are changed in the “Change password” panel on the same page.',
      },
      {
        q: 'What happens to my wishlist?',
        a: 'The wishlist is tied to your account, so it stays on your shelf when you sign in again from another device.',
      },
    ],
  },
  {
    id: 'books-editions',
    label: 'Books & Editions',
    items: [
      {
        q: 'Is the cover I see the one I will receive?',
        a: 'Yes. Each book page shows the cover of the exact volume being sold, along with the publisher, ISBN and language of that edition.',
      },
      {
        q: 'How do I find the next volume in a series?',
        a: 'Open the series from the book page and you will see every volume the store stocks, in reading order. The Series page lists the whole catalogue of series as well.',
      },
      {
        q: 'What does a struck-through price mean?',
        a: 'That is the original price of the edition, shown next to the price you pay. The saving is the difference between the two.',
      },
      {
        q: 'Why is a title out of stock?',
        a: 'Stock is tracked per volume by the store team, and the availability on each book page reflects the current count. Sold-out volumes reappear as soon as they are restocked.',
      },
      {
        q: 'How are books grouped?',
        a: 'By genre, using the categories the store manages: action, adventure, comedy, dark fantasy, fantasy, historical, horror, romance, sports, supernatural and thriller, among others.',
      },
    ],
  },
]

function Faq() {
  const [open, setOpen] = useState(() => new Set())

  const toggle = (key) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div>
      <ContentPage
        eyebrow="Customer care"
        title="Frequently asked questions."
        lede="Answers about the store as it works today — what the site can do, and what the team still needs to confirm."
        breadcrumb={{ to: '/contact', label: 'Customer care' }}
      >
        <div className="mt-14 space-y-14">
          {GROUPS.map((group) => (
            <section key={group.id} id={group.id} className="scroll-mt-32">
              <h2 className="font-display text-xl font-bold tracking-tight text-moon">{group.label}</h2>
              <div className="mt-6 border-t border-line">
                {group.items.map((item) => {
                  const key = `${group.id}:${item.q}`
                  const isOpen = open.has(key)
                  return (
                    <div key={key} className="border-b border-line">
                      <h3>
                        <button
                          type="button"
                          onClick={() => toggle(key)}
                          aria-expanded={isOpen}
                          className="flex w-full items-start justify-between gap-6 py-5 text-left"
                        >
                          <span className="text-base font-semibold text-moon">{item.q}</span>
                          <span aria-hidden="true" className={`mt-1 shrink-0 text-electric transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
                            +
                          </span>
                        </button>
                      </h3>
                      {isOpen && <p className="pb-6 pr-10 leading-relaxed text-moon/80">{item.a}</p>}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 border-t border-line pt-10">
          <p className="text-mist">
            Still stuck?{' '}
            <Link to="/contact" className="text-moon underline decoration-electric/60 underline-offset-4 transition-colors hover:text-electric">
              Send the store a message
            </Link>{' '}
            and the team will get back to you.
          </p>
        </div>
      </ContentPage>
    </div>
  )
}

export default Faq
