// Remembers the last few books a visitor opened, in this browser only. Stores
// just what's needed to link back (no prices, which could go stale).
const KEY = 'bookstore:recently-viewed'
const MAX = 8

const read = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export const getRecentlyViewed = () => read()

export const recordView = (book) => {
  if (!book?._id) return
  const entry = {
    _id: book._id,
    id: book._id,
    title: book.title,
    author: book.author,
    image: book.image || book.coverImage || '',
    colors: book.colors,
    glyph: book.glyph,
    series: book.series,
    volumeNumber: book.volumeNumber,
  }
  try {
    const next = [entry, ...read().filter((b) => b._id !== book._id)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage full or disabled: recently viewed is a nice-to-have.
  }
}
