import { useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage, faUpload } from '@fortawesome/free-solid-svg-icons'
import { api } from '../../api/client'
import { resolveCoverUrl } from '../../utils/coverUrl'
import { Button, Field, inputClass } from '../components/Ui'

// Mirrors the title into a slug until the author edits the slug themselves.
const slugify = (value) =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200)

function BlogForm({ initial, onSubmit, onCancel, saving, error }) {
  const [form, setForm] = useState(initial)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)
  const slugTouched = useRef(Boolean(initial.slug))

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const handleTitle = (value) => {
    setForm((f) => ({
      ...f,
      title: value,
      slug: slugTouched.current ? f.slug : slugify(value),
    }))
  }

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const res = await api.uploadBlogImage(file)
      if (res.success) {
        set({ coverImage: res.data.coverImage })
      } else {
        setUploadError(res.message || 'Upload failed')
      }
    } catch (err) {
      setUploadError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    onSubmit({
      title: form.title,
      slug: form.slug || undefined,
      excerpt: form.excerpt || undefined,
      content: form.content,
      coverImage: form.coverImage || undefined,
      category: form.category || undefined,
      author: form.author || undefined,
      status: form.status,
      featured: Boolean(form.featured),
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Field label="Title">
        <input
          value={form.title}
          onChange={(e) => handleTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="A chapter worth reading"
          className={inputClass}
        />
      </Field>

      <Field label="Slug" hint="The article lives at /blog/<slug>. Leave empty to generate one from the title.">
        <input
          value={form.slug}
          onChange={(e) => {
            slugTouched.current = true
            set({ slug: slugify(e.target.value) })
          }}
          maxLength={220}
          placeholder="a-chapter-worth-reading"
          className={inputClass}
        />
      </Field>

      <Field label="Excerpt" hint="Shown on the blog index and under the headline. Up to 500 characters.">
        <textarea
          value={form.excerpt}
          onChange={(e) => set({ excerpt: e.target.value })}
          rows={3}
          maxLength={500}
          placeholder="One or two lines that make someone want to read on."
          className={`${inputClass} resize-y`}
        />
      </Field>

      <Field
        label="Content"
        hint="Blank line starts a new paragraph, “## ” starts a section heading, “- ” starts a bullet."
      >
        <textarea
          value={form.content}
          onChange={(e) => set({ content: e.target.value })}
          rows={14}
          required
          placeholder={'## The opening\n\nWrite the article here.\n\n- a point worth making'}
          className={`${inputClass} resize-y font-mono text-[13px] leading-relaxed`}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" hint="Used for the blog filters.">
          <input
            value={form.category}
            onChange={(e) => set({ category: e.target.value })}
            maxLength={60}
            placeholder="Journal"
            className={inputClass}
          />
        </Field>
        <Field label="Author" hint="Leave empty to use the store's editorial byline.">
          <input
            value={form.author}
            onChange={(e) => set({ author: e.target.value })}
            maxLength={100}
            placeholder="Book Store Editorial"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-600">Cover image</span>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <input
            value={form.coverImage}
            onChange={(e) => set({ coverImage: e.target.value })}
            placeholder="https://… or upload a file"
            aria-label="Cover image URL"
            className={inputClass}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
          <Button
            variant="ghost"
            busy={uploading}
            onClick={() => fileRef.current?.click()}
            className="shrink-0"
          >
            <FontAwesomeIcon icon={faUpload} />
            Upload
          </Button>
        </div>
        <span className="mt-1 block text-[11px] text-slate-500">
          Paste a link or upload a file. Uploads are stored on the server.
        </span>
        {uploadError && <p className="mt-2 text-xs text-red-700">{uploadError}</p>}
        {form.coverImage && (
          <div className="mt-3 flex items-center gap-4">
            <img
              src={resolveCoverUrl(form.coverImage)}
              alt=""
              className="h-20 w-32 rounded object-cover"
              onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
            />
            <button type="button" onClick={() => set({ coverImage: '' })} className="text-xs font-semibold text-red-700 hover:underline">
              <FontAwesomeIcon icon={faImage} className="mr-1" />
              Remove image
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set({ status: e.target.value })}
            className={`${inputClass} sm:w-44`}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </Field>

        <label className="flex items-center gap-2 pb-2.5 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(form.featured)}
            onChange={(e) => set({ featured: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Feature on the blog index
        </label>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
        <Button variant="ghost" onClick={onCancel} type="button">Cancel</Button>
        <Button type="submit" busy={saving}>
          {form.id ? 'Save changes' : 'Create post'}
        </Button>
      </div>
    </form>
  )
}

export default BlogForm
