import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faTrash, faEnvelopeOpen, faEnvelope, faInbox } from '@fortawesome/free-solid-svg-icons'
import { api } from '../../api/client'
import { useAsync } from '../hooks/useAsync'
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Modal,
  Pagination,
  Spinner,
  Table,
  Toolbar,
  inputClass,
} from '../components/Ui'
import { formatDate, formatNumber } from '../utils/format'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All messages' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
]

function Messages() {
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [active, setActive] = useState(null) // message being inspected
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState({ tone: '', message: '' })
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const { data, loading, error, reload } = useAsync(
    async () => {
      const res = await api.getContactMessages({ status, page, limit: 20 })
      if (!res.success) throw new Error(res.message || 'Failed to load messages')
      return res.data
    },
    [status, page],
  )

  const messages = data?.messages ?? []
  const unreadCount = data?.unreadCount ?? 0
  const pagination = data?.pagination

  const openMessage = async (message) => {
    setActive(message)
    // Opening a message marks it read; failure is silent and non-blocking.
    if (!message.isRead) {
      try {
        const res = await api.markContactMessageRead(message._id, true)
        if (res.success) {
          setActive(res.data.message)
          reload()
        }
      } catch {
        // The inbox refetch will show the current state anyway.
      }
    }
  }

  const toggleRead = async (message) => {
    setSaving(true)
    try {
      const res = await api.markContactMessageRead(message._id, !message.isRead)
      if (res.success) {
        setActive(res.data.message)
        setFlash({ tone: 'success', message: res.data.message.isRead ? 'Marked as read' : 'Marked as unread' })
        reload()
      } else {
        setFlash({ tone: 'error', message: res.message || 'Could not update the message' })
      }
    } catch (err) {
      setFlash({ tone: 'error', message: err.message || 'Could not update the message' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const res = await api.deleteContactMessage(pendingDelete._id)
      if (res.success) {
        setFlash({ tone: 'success', message: 'Message deleted' })
        setPendingDelete(null)
        setActive(null)
        reload()
      } else {
        setFlash({ tone: 'error', message: res.message || 'Could not delete the message' })
      }
    } catch (err) {
      setFlash({ tone: 'error', message: err.message || 'Could not delete the message' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0 ? `${formatNumber(unreadCount)} unread` : 'No unread messages'} from the contact form
          </p>
        </div>
      </div>

      <Alert tone={flash.tone} message={flash.message} onDismiss={() => setFlash({ tone: '', message: '' })} />

      <Toolbar>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          aria-label="Filter messages"
          className={`${inputClass} sm:max-w-48`}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <Button variant="ghost" onClick={reload}>Refresh</Button>
      </Toolbar>

      {loading ? (
        <Spinner label="Loading messages..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : messages.length === 0 ? (
        <EmptyState
          title={status === 'unread' ? 'No unread messages' : status === 'read' ? 'No read messages yet' : 'No messages yet'}
          hint="Submissions from the public contact form will appear here."
        />
      ) : (
        <>
          <Table head={['', 'From', 'Preview', 'Received', 'Actions']}>
            {messages.map((message) => (
              <tr key={message._id} className={`hover:bg-slate-50 ${message.isRead ? '' : 'bg-blue-50/50'}`}>
                <td className="px-4 py-3 text-slate-500">
                  <FontAwesomeIcon icon={message.isRead ? faEnvelopeOpen : faEnvelope} title={message.isRead ? 'Read' : 'Unread'} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-700">{message.name}</p>
                  <p className="text-xs text-slate-500">{message.email}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="max-w-md truncate text-slate-600">{message.message}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(message.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openMessage(message)}
                      aria-label={`View message from ${message.name}`}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(message)}
                      aria-label="Delete message"
                      className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>

          <Pagination page={page} totalPages={pagination?.totalPages ?? 1} onChange={setPage} />
        </>
      )}

      {active && (
        <Modal title="Message" onClose={() => setActive(null)} wide>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">From</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{active.name}</p>
                <a href={`mailto:${active.email}`} className="mt-0.5 block text-sm text-[#2563EB] hover:underline">
                  {active.email}
                </a>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">Received</p>
                <p className="mt-1 text-sm text-slate-700">{formatDate(active.createdAt)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">Status</p>
                <p className="mt-1 text-sm text-slate-700">{active.isRead ? 'Read' : 'Unread'}</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{active.message}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
              <Button variant="ghost" busy={saving} onClick={() => toggleRead(active)}>
                {active.isRead ? 'Mark as unread' : 'Mark as read'}
              </Button>
              <Button variant="danger" onClick={() => setPendingDelete(active)}>
                <FontAwesomeIcon icon={faTrash} />
                Delete
              </Button>
              <Button variant="ghost" onClick={() => setActive(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete message"
          message={`The message from "${pendingDelete.name}" will be permanently deleted. This cannot be undone.`}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}

export default Messages
