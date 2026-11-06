const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// Non-numeric / missing prices render as "$0" instead of "$NaN".
export const formatPrice = (value) => usd.format(Number.isFinite(Number(value)) ? Number(value) : 0)

/** "12 Mar 2026" — used for blog dates and order history. */
export const formatDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}


// Stock is only known for books that came from the API.
export function availabilityOf(stock) {
  if (typeof stock !== 'number') return null
  if (stock <= 0) return { label: 'Out of stock', tone: 'text-red-600' }
  if (stock <= 5) return { label: `Only ${stock} left`, tone: 'text-amber-600' }
  return { label: 'In stock', tone: 'text-electric' }
}
