import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import ContentPage from '../components/ContentPage'

// Real numbers, read from the live catalogue, so the page never drifts from
// what the store actually sells.
function StoreFacts() {
  const [facts, setFacts] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [books, series, categories, authors] = await Promise.all([
        api.getBooks({ limit: 1 }).catch(() => null),
        api.getSeries().catch(() => null),
        api.getCategories().catch(() => null),
        api.getAuthors().catch(() => null),
      ])
      if (cancelled) return
      setFacts({
        volumes: books?.data?.pagination?.totalBooks ?? null,
        series: series?.data?.series?.length ?? null,
        genres: categories?.data?.categories?.length ?? null,
        authors: authors?.data?.authors?.length ?? null,
      })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!facts) return null

  const items = [
    ['Volumes in stock', facts.volumes],
    ['Series tracked', facts.series],
    ['Genres catalogued', facts.genres],
    ['Authors on the shelf', facts.authors],
  ].filter(([, value]) => typeof value === 'number' && value > 0)

  if (!items.length) return null

  return (
    <dl className="mt-16 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-line pt-12 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="eyebrow text-mist">{label}</dt>
          <dd className="mt-3 font-display text-3xl font-bold tabular-nums text-moon">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function About() {
  return (
    <div>
      <ContentPage
        eyebrow="About the store"
        title="A shelf built one volume at a time."
        lede="Book Store is an online bookstore for manga, light novels and collector editions — built around the exact volume you receive, not a vague series listing."
        sections={[
          {
            id: 'what-we-do',
            heading: 'What we do',
            paragraphs: [
              'Every title in the catalogue is a single, specific volume: the cover you see is the cover that ships. Series are listed with their volume numbers so you can pick up exactly where you left off, and each book page shows the publisher, ISBN, language, and the price you pay.',
              'The catalogue is managed by the store team through an internal dashboard, which means stock, pricing and availability are updated by the people who actually handle the books.',
            ],
          },
          {
            id: 'how-it-works',
            heading: 'How shopping works here',
            bullets: [
              'Create an account with an email address and password, or sign in with Google.',
              'Save titles to your wishlist and come back to them later.',
              'Add volumes to your cart, set a quantity, and check out with Cash on Delivery.',
              'Every order keeps its own page in your account, with a live status from placed to delivered.',
            ],
          },
          {
            id: 'editorial',
            heading: 'The journal',
            paragraphs: [
              'The journal collects release notes, collecting guides and shelf talk written by the store team. It is published from the same dashboard that manages the catalogue, so what you read is what the team actually put live.',
            ],
          },
        ]}
      >
        <StoreFacts />

        <div className="mt-16 flex flex-wrap gap-4 border-t border-line pt-10">
          <Link to="/all-books" className="inline-flex min-h-12 items-center bg-sakura px-6 font-semibold text-white transition-colors hover:bg-[#2563EB]">
            Browse the catalogue
          </Link>
          <Link to="/contact" className="inline-flex min-h-12 items-center border border-line px-6 font-semibold transition-colors hover:border-electric hover:text-electric">
            Contact the store
          </Link>
        </div>
      </ContentPage>
    </div>
  )
}

export default About
