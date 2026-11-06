import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faPen, faTrash } from '@fortawesome/free-solid-svg-icons'
import { api } from '../../api/client'
import { useAsync } from '../hooks/useAsync'
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  Spinner,
  StatusBadge,
  Table,
  Toolbar,
  inputClass,
} from '../components/Ui'
import { formatNumber } from '../utils/format'

const EMPTY = { name: '', description: '', image: '', isActive: true }

function Categories() {
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(null) // null = closed
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [flash, setFlash] = useState({ tone: '', message: '' })
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const { data, loading, error, reload } = useAsync(async () => {
    // includeInactive so an admin can reactivate a hidden category.
    const res = await api.getCategories({ includeInactive: 'true' })
    if (!res.success) throw new Error(res.message || 'Failed to load categories')
    return res.data.categories ?? []
  }, [])

  const all = data ?? []
  const needle = search.trim().toLowerCase()
  const categories = needle
    ? all.filter((c) => c.name?.toLowerCase().includes(needle) || c.slug?.toLowerCase().includes(needle))
    : all

  const openCreate = () => {
    setEditingId(null)
    setFormError('')
    setForm({ ...EMPTY })
  }

  const openEdit = (cat) => {
    setEditingId(cat._id)
    setFormError('')
    setForm({
      name: cat.name ?? '',
      description: cat.description ?? '',
      image: cat.image ?? '',
      isActive: cat.isActive !== false,
    })
  }

  const handleSave = async () => {
    setFormError('')

    if (!form.name.trim()) {
      setFormError('Category name is required.')
      return
    }
    if (form.description.trim().length > 500) {
      setFormError('Description must be 500 characters or fewer.')
      return
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      image: form.image.trim() || undefined,
      isActive: form.isActive,
    }

    setSaving(true)
    try {
      const res = editingId ? await api.updateCategory(editingId, payload) : await api.createCategory(payload)
      if (res.success) {
        setFlash({ tone: 'success', message: editingId ? 'Category updated' : 'Category created' })
        setForm(null)
        setEditingId(null)
        reload()
      } else {
        setFormError(res.message || 'Could not save the category')
      }
    } catch (err) {
      setFormError(err.message || 'Could not save the category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const res = await api.deleteCategory(pendingDelete._id)
      if (res.success) {
        setFlash({ tone: 'success', message: `"${pendingDelete.name}" deleted` })
        setPendingDelete(null)
        reload()
      } else {
        setFlash({ tone: 'error', message: res.message || 'Could not delete the category' })
      }
    } catch (err) {
      setFlash({ tone: 'error', message: err.message || 'Could not delete the category' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatNumber(all.length)} categor{all.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <Button onClick={openCreate}>
          <FontAwesomeIcon icon={faPlus} />
          Add category
        </Button>
      </div>

      <Alert tone={flash.tone} message={flash.message} onDismiss={() => setFlash({ tone: '', message: '' })} />

      <Toolbar>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search categories"
          placeholder="Search by name or slug"
          className={`${inputClass} sm:max-w-sm`}
        />
      </Toolbar>

      {loading ? (
        <Spinner label="Loading categories..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : categories.length === 0 ? (
        <EmptyState
          title={needle ? 'No categories match your search' : 'No categories yet'}
          hint="Categories group your books in the storefront navigation."
          action={
            <Button onClick={openCreate} className="mt-2">
              <FontAwesomeIcon icon={faPlus} />
              Add category
            </Button>
          }
        />
      ) : (
        <Table head={['Name', 'Slug', 'Books', 'Status', 'Actions']}>
          {categories.map((c) => (
            <tr key={c._id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-700">{c.name}</p>
                {c.description && <p className="mt-0.5 max-w-md truncate text-xs text-slate-500">{c.description}</p>}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.slug}</td>
              <td className="px-4 py-3 font-semibold text-slate-700">{formatNumber(c.bookCount ?? 0)}</td>
              <td className="px-4 py-3">
                <StatusBadge value={c.isActive === false ? 'inactive' : 'active'} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    aria-label={`Edit ${c.name}`}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(c)}
                    aria-label={`Delete ${c.name}`}
                    className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {form && (
        <Modal title={editingId ? 'Edit category' : 'Add category'} onClose={() => setForm(null)}>
          {formError && (
            <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </p>
          )}
          <div className="space-y-4">
            <Field label="Name *" hint="The slug is generated from the name automatically">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <textarea
                rows="3"
                maxLength="500"
                className={`${inputClass} resize-y`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label="Image URL" hint="Optional — leave empty if unused">
              <input
                className={inputClass}
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://..."
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 accent-[#3B82F6]"
              />
              Visible in the storefront
            </label>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button busy={saving} onClick={handleSave}>
                {editingId ? 'Save changes' : 'Create category'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete category"
          message={`"${pendingDelete.name}" will be deleted. ${
            pendingDelete.bookCount > 0
              ? `It still has ${pendingDelete.bookCount} book(s) assigned, so the server will refuse this.`
              : 'It has no books assigned, so it can be removed safely.'
          }`}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}

export default Categories
