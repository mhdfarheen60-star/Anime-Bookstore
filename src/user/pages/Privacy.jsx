import { Link } from 'react-router-dom'
import ContentPage from '../components/ContentPage'

function Privacy() {
  return (
    <div>
      <ContentPage
        eyebrow="Policies"
        title="Privacy Policy"
        lede="What the store collects, why it collects it, and what it does with it."
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
            id: 'collect',
            heading: 'What is collected',
            bullets: [
              'Account details: name, email address, and — if you set one — a username, a short bio and an avatar image. Your password is stored only as a one-way hash and is never readable, even by the store.',
              'Order details: the shipping address, phone number, the titles and quantities ordered, and the amounts charged. These are kept so the store can fulfil and support your order.',
              'Wishlist and cart: the titles you save and the quantities you add, stored against your account.',
              'Session information: a signed session cookie, kept in your browser so you stay signed in.',
            ],
          },
          {
            id: 'google',
            heading: 'Google sign-in',
            paragraphs: [
              'If you sign in with Google, the store receives the identifier Google issues for your account and your email address. A separate password is never created for you, and Google’s own privacy policy governs what Google does with your data.',
            ],
          },
          {
            id: 'use',
            heading: 'How the data is used',
            bullets: [
              'To create and secure your account, and to sign you in.',
              'To process, deliver and support your orders.',
              'To keep your wishlist and cart available across devices.',
              'To show your own order history in your account.',
            ],
          },
          {
            id: 'sharing',
            heading: 'Who else sees it',
            paragraphs: [
              'Your details are shared with the delivery partner to the extent needed to hand over a parcel, and with the payment flow to the extent needed to take payment. Beyond that, the store does not sell personal data.',
              'The site loads web fonts from Google Fonts, which means your browser contacts Google when it fetches the font files.',
            ],
            note: 'The list of service providers the store works with — including the delivery partner and the payment provider — has not been confirmed yet, and should be added here before publication.',
          },
          {
            id: 'retention',
            heading: 'How long it is kept',
            paragraphs: [
              'Account and order records are kept for as long as the account is open, and for as long as the store needs them for tax and accounting purposes after that. Wishlist and cart items can be cleared at any time by removing the titles.',
            ],
          },
          {
            id: 'rights',
            heading: 'Your choices',
            paragraphs: [
              'You can change your name, username, email address, bio and avatar from your account at any time, and you can change your password from the same page.',
              'Requests to access, correct or delete your personal data can be sent to the store through the contact page and will be handled by the team.',
            ],
          },
        ]}
      >
        <div className="mt-10 border-t border-line pt-10">
          <p className="text-mist">
            Questions about your data?{' '}
            <Link to="/contact" className="text-moon underline decoration-electric/60 underline-offset-4 transition-colors hover:text-electric">
              Contact the store
            </Link>
            .
          </p>
        </div>
      </ContentPage>
    </div>
  )
}

export default Privacy
