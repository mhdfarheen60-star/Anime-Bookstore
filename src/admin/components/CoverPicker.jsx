import { useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faUpload, faTrash, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { api } from '../../api/client'
import BookCover from '../../user/components/BookCover'
import { inputClass } from './Ui'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const VERDICTS = {
  strong: { label: 'Matches this book', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  weak: { label: 'Check carefully', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  mismatch: { label: 'Does not match', tone: 'bg-red-50 text-red-700 ring-red-200' },
}

const describeSource = (ref) => {
  if (!ref) return 'No cover. Shoppers see a neutral placeholder.'
  if (ref.startsWith('/uploads/')) return 'Uploaded image'
  try {
    return `Linked from ${new URL(ref).hostname}`
  } catch {
    return ref
  }
}

/**
 * Lets an admin find, upload, replace or remove a book's cover.
 * Only changes the form value: nothing is saved until the book form is submitted,
 * and no search result is ever picked automatically.
 */
function CoverPicker({ value, onChange, book }) {
  const [results, setResults] = useState(null) // null = not searched yet
  const [notes, setNotes] = useState([])
  const [searching, setSearching] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showUrl, setShowUrl] = useState(false)
  const fileRef = useRef(null)

  const search = async () => {
    setError('')
    if (!book.title.trim() && !book.isbn.trim()) {
      setError('Enter the title or ISBN first, then search.')
      return
    }
    setSearching(true)
    try {
      const res = await api.searchCovers({
        title: book.title.trim(),
        author: book.author.trim(),
        isbn: book.isbn.trim(),
        series: book.series.trim(),
        volumeNumber: book.volumeNumber,
      })
      const data = res.data ?? {}
      setResults(data.candidates ?? [])
      const extra = [...(data.errors ?? [])]
      if (data.isbnValid === false) extra.unshift('The ISBN entered is not a valid ISBN, so results are matched by title and volume only.')
      setNotes(extra)
    } catch (err) {
      setError(err.message || 'Cover search failed')
    } finally {
      setSearching(false)
    }
  }

  const choose = (candidate) => {
    if (candidate.match.verdict === 'mismatch') {
      const ok = window.confirm(
        `This result does not look like the same book:\n\n- ${candidate.match.reasons.join('\n- ')}\n\nUse it anyway?`,
      )
      if (!ok) return
    }
    onChange(candidate.coverUrl)
  }

  const upload = async (file) => {
    setError('')
    if (!file) return
    if (!ACCEPTED.includes(file.type)) {
      setError('Choose a JPEG, PNG, WebP or GIF image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('That image is larger than 5 MB.')
      return
    }
    setUploading(true)
    try {
      const res = await api.uploadCover(file)
      onChange(res.data.coverImage)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="w-32 shrink-0 overflow-hidden rounded-md bg-slate-900 shadow">
          <BookCover book={{ title: book.title || 'Untitled', author: book.author, image: value, colors: book.colors }} eager />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Cover image</p>
            <p className="truncate text-xs text-slate-500" title={value || ''}>{describeSource(value)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={search} disabled={searching}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
              <FontAwesomeIcon icon={searching ? faSpinner : faMagnifyingGlass} spinPulse={searching} />
              {searching ? 'Searching...' : 'Find matching cover'}
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
              <FontAwesomeIcon icon={uploading ? faSpinner : faUpload} spinPulse={uploading} />
              {uploading ? 'Uploading...' : value ? 'Upload replacement' : 'Upload image'}
            </button>
            <input ref={fileRef} type="file" accept={ACCEPTED.join(',')} className="hidden"
              onChange={(e) => upload(e.target.files?.[0])} />
            {value && (
              <button type="button" onClick={() => onChange('')}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
                <FontAwesomeIcon icon={faTrash} />
                Remove cover
              </button>
            )}
            <button type="button" onClick={() => setShowUrl((v) => !v)}
              className="px-1 text-xs font-semibold text-slate-600 hover:text-slate-800">
              {showUrl ? 'Hide URL' : 'Paste a URL'}
            </button>
          </div>

          {showUrl && (
            <input className={inputClass} value={value} placeholder="https://..."
              aria-label="Cover image URL" onChange={(e) => onChange(e.target.value.trim())} />
          )}

          <p className="text-xs text-slate-500">
            Search uses the ISBN first, then the series and volume number. Check the volume number and
            edition on the cover before choosing it. Changes are saved when you save the book.
          </p>
          {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
        </div>
      </div>

      {results && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          {notes.map((note) => <p key={note} className="mb-2 text-xs text-amber-700">{note}</p>)}
          {results.length === 0 ? (
            <p className="text-sm text-slate-500">
              No catalogue covers found. Upload the correct cover instead, or leave it empty to show the placeholder.
            </p>
          ) : (
            <ul className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
              {results.map((c) => {
                const verdict = VERDICTS[c.match.verdict]
                const selected = value === c.coverUrl
                return (
                  <li key={c.coverUrl} className={`flex flex-col rounded-lg border p-2 ${selected ? 'border-[#3B82F6] ring-2 ring-[#3B82F6]/30' : 'border-slate-200'}`}>
                    <div className="overflow-hidden rounded bg-slate-900">
                      <BookCover book={{ title: c.title, author: (c.authors ?? []).join(', '), image: c.thumbnailUrl }} />
                    </div>
                    <span className={`mt-2 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${verdict.tone}`}>{verdict.label}</span>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-700">{c.title}</p>
                    <p className="line-clamp-1 text-[11px] text-slate-500">
                      {[c.publisher, c.publishedDate].filter(Boolean).join(' · ') || '—'}
                    </p>
                    {c.isbns?.length > 0 && <p className="line-clamp-1 text-[11px] text-slate-500">ISBN {c.isbns.join(', ')}</p>}
                    <p className="text-[11px] text-slate-500">
                      {c.sourceUrl ? <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-slate-700">{c.source}</a> : c.source}
                    </p>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                      {c.match.reasons.map((r) => <li key={r}>• {r}</li>)}
                    </ul>
                    <button type="button" onClick={() => choose(c)} disabled={selected}
                      className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:border-[#3B82F6] disabled:text-[#2563EB]">
                      {selected ? <><FontAwesomeIcon icon={faCheck} /> Selected</> : 'Use this cover'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default CoverPicker
