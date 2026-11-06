// Uploaded covers are stored as "/uploads/covers/<file>" and served by the API
// server, which runs on a different origin from the Vite app. Catalogue covers
// are already absolute URLs.
const API_ORIGIN = (() => {
  try {
    return new URL(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').origin
  } catch {
    return ''
  }
})()

export const resolveCoverUrl = (ref) => {
  if (!ref || typeof ref !== 'string') return ''
  if (/^https?:\/\//i.test(ref)) return ref
  if (ref.startsWith('/uploads/')) return `${API_ORIGIN}${ref}`
  return ''
}

/** Accepts both the transformed book ({ image }) and a raw API book ({ coverImage }). */
export const coverOf = (book) => resolveCoverUrl(book?.image || book?.coverImage)

// Open Library serves each cover in several sizes (-M ~180px wide, -L larger).
// Offering both lets small cards download the light version.
const OPEN_LIBRARY = /^(https:\/\/covers\.openlibrary\.org\/b\/id\/\d+)-[SML]\.jpg$/

export const coverSrcSet = (src) => {
  const match = src.match(OPEN_LIBRARY)
  return match ? `${match[1]}-M.jpg 180w, ${match[1]}-L.jpg 500w` : undefined
}
