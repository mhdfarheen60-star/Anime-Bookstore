import { useState } from 'react'
import { Button, Field, Modal, inputClass } from '../components/Ui'
import { emptyBookForm } from './bookFormDefaults'
import CoverPicker from '../components/CoverPicker'

/** Create/edit form for a book. Owns no fetching – the page does that. */
function BookForm({ initial, categories, saving = false, error = '', onSubmit, onCancel }) {
  const [form, setForm] = useState(initial ?? emptyBookForm)
  const [localError, setLocalError] = useState('')

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setLocalError('')

    if (!form.title.trim() || !form.author.trim() || !form.description.trim()) {
      setLocalError('Title, author and description are required.')
      return
    }
    if (!form.category) {
      setLocalError('Please choose a category.')
      return
    }

    const price = Number(form.price)
    if (Number.isNaN(price) || price < 0) {
      setLocalError('Please enter a valid price.')
      return
    }

    const stock = Number(form.stock)
    if (Number.isNaN(stock) || stock < 0) {
      setLocalError('Please enter a valid stock quantity.')
      return
    }

    const volumeText = String(form.volumeNumber ?? '').trim()
    const volumeNumber = volumeText === '' ? null : Number(volumeText)
    if (volumeNumber !== null && (!Number.isInteger(volumeNumber) || volumeNumber < 0)) {
      setLocalError('Volume must be a whole number.')
      return
    }

    const colors = form.colors.split(',').map((c) => c.trim()).filter(Boolean)
    const isbn = form.isbn.trim()
    const tags = (Array.isArray(form.tags) ? form.tags : String(form.tags ?? '').split(','))
      .map((tag) => tag.trim())
      .filter(Boolean)
    const publicationDate = String(form.publicationDate ?? '').slice(0, 10)

    // When editing, an emptied field is sent as '' so the server clears it.
    // When creating, empty fields are simply left out.
    const cleared = initial ? '' : undefined

    // eslint-disable-next-line no-unused-vars -- id is the route param, not a field
    const { id, ...fields } = form
    onSubmit({
      ...fields,
      price,
      stock,
      originalPrice: form.originalPrice === '' ? cleared : Number(form.originalPrice),
      publishedYear: form.publishedYear === '' ? undefined : Number(form.publishedYear),
      // Only send the ISBN when it changed, so editing other fields of a book whose
      // stored ISBN is malformed doesn't get blocked by ISBN validation.
      isbn: initial && isbn === (initial.isbn ?? '') ? undefined : isbn || cleared,
      coverImage: form.coverImage.trim() || cleared,
      series: form.series.trim() || cleared,
      volumeNumber: volumeNumber ?? cleared,
      publisher: form.publisher.trim() || undefined,
      illustrator: form.illustrator.trim() || cleared,
      edition: form.edition.trim() || cleared,
      pages: form.pages === '' ? cleared : Number(form.pages),
      format: form.format.trim() || cleared,
      publicationDate: publicationDate || cleared,
      seriesStatus: form.seriesStatus || cleared,
      tags,
      colors: colors.length ? colors : undefined,
    })
  }

  const shownError = error || localError

  return (
    <Modal title={initial ? 'Edit book' : 'Add book'} onClose={onCancel} wide>
      {shownError && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {shownError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title *">
            <input className={inputClass} value={form.title} onChange={(e) => set({ title: e.target.value })} required />
          </Field>
          <Field label="Author *">
            <input className={inputClass} value={form.author} onChange={(e) => set({ author: e.target.value })} required />
          </Field>
          <Field label="Category *">
            <select className={inputClass} value={form.category} onChange={(e) => set({ category: e.target.value })} required>
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="ISBN" hint="ISBN-13 or ISBN-10, must be unique. Used first when searching for the cover.">
            <input className={inputClass} value={form.isbn} onChange={(e) => set({ isbn: e.target.value })} />
          </Field>
          <Field label="Series" hint="e.g. Jujutsu Kaisen">
            <input className={inputClass} value={form.series} onChange={(e) => set({ series: e.target.value })} />
          </Field>
          <Field label="Volume number">
            <input type="number" min="0" step="1" className={inputClass} value={form.volumeNumber}
              onChange={(e) => set({ volumeNumber: e.target.value })} />
          </Field>
          <Field label="Illustrator" hint="Artist credited for the interior art">
            <input className={inputClass} value={form.illustrator} onChange={(e) => set({ illustrator: e.target.value })} />
          </Field>
          <Field label="Edition" hint="e.g. Standard Edition, Deluxe Edition, Omnibus">
            <input className={inputClass} value={form.edition} onChange={(e) => set({ edition: e.target.value })} />
          </Field>
          <Field label="Format" hint="e.g. Paperback, Hardcover, Box Set">
            <input className={inputClass} value={form.format} onChange={(e) => set({ format: e.target.value })} />
          </Field>
          <Field label="Pages">
            <input type="number" min="1" step="1" className={inputClass} value={form.pages}
              onChange={(e) => set({ pages: e.target.value })} />
          </Field>
          <Field label="Price (USD) *">
            <input type="number" min="0" step="0.01" className={inputClass} value={form.price}
              onChange={(e) => set({ price: e.target.value })} required />
          </Field>
          <Field label="Original price (USD)" hint="Shown struck-through next to the sale price">
            <input type="number" min="0" step="0.01" className={inputClass} value={form.originalPrice}
              onChange={(e) => set({ originalPrice: e.target.value })} />
          </Field>
          <Field label="Stock *">
            <input type="number" min="0" className={inputClass} value={form.stock}
              onChange={(e) => set({ stock: e.target.value })} required />
          </Field>
          <Field label="Publisher">
            <input className={inputClass} value={form.publisher} onChange={(e) => set({ publisher: e.target.value })} />
          </Field>
          <Field label="Published year">
            <input type="number" min="1000" max={new Date().getFullYear() + 1} className={inputClass}
              value={form.publishedYear} onChange={(e) => set({ publishedYear: e.target.value })} />
          </Field>
          <Field label="Language">
            <input className={inputClass} value={form.language} onChange={(e) => set({ language: e.target.value })} />
          </Field>
          <Field label="Publication date">
            <input type="date" className={inputClass} value={String(form.publicationDate ?? '').slice(0, 10)}
              onChange={(e) => set({ publicationDate: e.target.value })} />
          </Field>
          <Field label="Series status">
            <select className={inputClass} value={form.seriesStatus} onChange={(e) => set({ seriesStatus: e.target.value })}>
              <option value="">Not set</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Upcoming">Upcoming</option>
            </select>
          </Field>
          <Field label="Shelf tags" hint="Comma-separated, e.g. Bestsellers, New Releases, Box Sets">
            <input className={inputClass} value={Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags ?? '')}
              onChange={(e) => set({ tags: e.target.value })} />
          </Field>
        </div>

        <Field label="Description *">
          <textarea rows="4" className={`${inputClass} resize-y`} value={form.description}
            onChange={(e) => set({ description: e.target.value })} required />
        </Field>

        <CoverPicker
          value={form.coverImage}
          onChange={(coverImage) => set({ coverImage })}
          book={{
            title: form.title,
            author: form.author,
            isbn: form.isbn,
            series: form.series,
            volumeNumber: form.volumeNumber,
            colors: form.colors.split(',').map((c) => c.trim()).filter(Boolean),
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Placeholder colours" hint="Two comma-separated hex values, used when there is no cover image">
            <input className={inputClass} value={form.colors} onChange={(e) => set({ colors: e.target.value })} />
          </Field>
          <Field label="Placeholder glyph" hint="Single character shown when there is no cover image">
            <input className={inputClass} maxLength="2" value={form.glyph} onChange={(e) => set({ glyph: e.target.value })} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })}
            className="h-4 w-4 accent-[#3B82F6]" />
          Feature on the home page
        </label>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button busy={saving} onClick={handleSubmit}>
            {initial ? 'Save changes' : 'Create book'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default BookForm
