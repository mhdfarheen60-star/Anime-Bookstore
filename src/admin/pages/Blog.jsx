import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faPlus, faSearch, faTrash, faEye } from '@fortawesome/free-solid-svg-icons'
import { api } from '../../api/client'
import { useAsync } from '../hooks/useAsync'
import BlogForm from './BlogForm'
import { emptyBlogForm } from './blogFormDefaults'
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Modal,
  Pagination,
  Spinner,
  StatusBadge,
  Table,
  Toolbar,
  inputClass,
} from '../components/Ui'
import { formatDate, formatNumber } from '../utils/format'

// "…?search=a&status=draft&page=2" -> { search, status, page }
const readParams = (search) => {
  const p = new URLSearchParams(search)
  return {
    search: p.get('search') ?? '',
    status: p.get('status') ?? 'all',
    page: Number(p.get('page') ?? 1),
  }
}

const STATUS_TONE = { draft: 'inactive', published: 'active' }

function Blog() {
  const [params, setParams] = useState(() => readParams(window.location.search))
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [flash, setFlash] = useState({ tone: '', message: '' })
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const onPop = () => setParams(readParams(window.location.search))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const update = (patch) => {
    const next = { ...params, ...patch }
    if ((patch.search !== undefined || patch.status !== undefined) && patch.page === undefined) {
      next.page = 1
    }
    const p = new URLSearchParams()
    if (next.search) p.set('search', next.search)
    if (next.status && next.status !== 'all') p.set('status', next.status)
    if (next.page > 1) p.set('page', String(next.page))

    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
    setParams(next)
  }

  const { data, loading, error, reload } = useAsync(
    async () => {
      const res = await api.getAllBlogPosts({ search: params.search || undefined, status: params.status === 'all' ? undefined : params.status, page: params.page, limit: 20 })
      if (!res.success) throw new Error(res.message || 'Failed to load posts')
      return { posts: res.data.posts ?? [], pagination: res.data.pagination }
    },
    [params.search, params.status, params.page],
  )

  const posts = data?.posts ?? []
  const pagination = data?.pagination

  const openCreate = () => {
    setEditing(emptyBlogForm)
    setFormError('')
    setFormOpen(true)
  }

  const openEdit = (post) => {
    setEditing({
      id: post._id,
      title: post.title ?? '',
      slug: post.slug ?? '',
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      coverImage: post.coverImage ?? '',
      category: post.category ?? 'Journal',
      author: post.author ?? '',
      status: post.status ?? 'draft',
      featured: Boolean(post.featured),
      tags: post.tags ?? [],
    })
    setFormError('')
    setFormOpen(true)
  }

  const handleSave = async (payload) => {
    setSaving(true)
    setFormError('')
    try {
      const res = editing?.id ? await api.updateBlogPost(editing.id, payload) : await api.createBlogPost(payload)
      if (res.success) {
        setFlash({ tone: 'success', message: editing?.id ? 'Post updated' : 'Post created' })
        setFormOpen(false)
        setEditing(null)
        reload()
      } else {
        setFormError(res.message || 'Could not save the post')
      }
    } catch (err) {
      setFormError(err.message || 'Could not save the post')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const res = await api.deleteBlogPost(pendingDelete._id)
      if (res.success) {
        setFlash({ tone: 'success', message: `"${pendingDelete.title}" deleted` })
        setPendingDelete(null)
        reload()
      } else {
        setFlash({ tone: 'error', message: res.message || 'Could not delete the post' })
      }
    } catch (err) {
      setFlash({ tone: 'error', message: err.message || 'Could not delete the post' })
    } finally {
      setDeleting(false)
    }
  }

  const togglePublished = async (post) => {
    try {
      const res = await api.updateBlogPost(post._id, { status: post.status === 'published' ? 'draft' : 'published' })
      if (res.success) {
        setFlash({
          tone: 'success',
          message: post.status === 'published' ? 'Moved back to drafts' : 'Post published',
        })
        reload()
      } else {
        setFlash({ tone: 'error', message: res.message || 'Could not update the post' })
      }
    } catch (err) {
      setFlash({ tone: 'error', message: err.message || 'Could not update the post' })
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold">Blog</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pagination ? `${formatNumber(pagination.totalPosts)} post(s) in the journal` : 'Write the store’s journal'}
          </p>
        </div>
        <Button onClick={openCreate}>
          <FontAwesomeIcon icon={faPlus} />
          New post
        </Button>
      </div>

      <Alert tone={flash.tone} message={flash.message} onDismiss={() => setFlash({ tone: '', message: '' })} />

      <Toolbar>
        <div className="relative flex-1 sm:max-w-sm">
          <FontAwesomeIcon icon={faSearch} className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-500" />
          <input
            type="search"
            value={params.search}
            onChange={(e) => update({ search: e.target.value })}
            aria-label="Search posts"
            placeholder="Search title or content"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={params.status}
          onChange={(e) => update({ status: e.target.value })}
          aria-label="Filter by status"
          className={`${inputClass} sm:max-w-48`}
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
      </Toolbar>

      {loading ? (
        <Spinner label="Loading posts..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : posts.length === 0 ? (
        <EmptyState
          title="No blog posts found"
          hint="Create your first blog post to get started. Only published posts appear on the public blog."
          action={
            <Button onClick={openCreate} className="mt-2">
              <FontAwesomeIcon icon={faPlus} />
              New post
            </Button>
          }
        />
      ) : (
        <>
          <Table head={['Post', 'Category', 'Status', 'Published', 'Actions']}>
            {posts.map((post) => (
              <tr key={post._id}>
                <td>
                  <div className="font-semibold text-slate-900">{post.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    /blog/{post.slug}
                    {post.featured ? ' · featured' : ''}
                    {post.readingTime ? ` · ${post.readingTime} min` : ''}
                  </div>
                </td>
                <td className="text-slate-700">{post.category}</td>
                <td><StatusBadge value={STATUS_TONE[post.status] ?? post.status} /></td>
                <td className="text-slate-600">{post.publishedAt ? formatDate(post.publishedAt) : '—'}</td>
                <td>
                  <div className="flex items-center gap-2">
                    {post.status === 'published' && (
                      <Link
                        to={`/blog/${post.slug}`}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        aria-label={`View ${post.title}`}
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(post)}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      aria-label={`Edit ${post.title}`}
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePublished(post)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      {post.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(post)}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      aria-label={`Delete ${post.title}`}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>

          {pagination && (
            <Pagination page={params.page} totalPages={pagination.totalPages} onChange={(p) => update({ page: p })} />
          )}
        </>
      )}

      {formOpen && (
        <Modal title={editing?.id ? 'Edit post' : 'New post'} onClose={() => setFormOpen(false)} wide>
          <BlogForm
            initial={editing}
            onSubmit={handleSave}
            onCancel={() => setFormOpen(false)}
            saving={saving}
            error={formError}
          />
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete this post?"
          message={`“${pendingDelete.title}” will be removed from the journal. This cannot be undone.`}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}

export default Blog
