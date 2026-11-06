import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faUser, faUserShield, faUserPlus, faEye } from '@fortawesome/free-solid-svg-icons'
import { api } from '../../api/client'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../../context/useAuth'
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
import { formatNumber, formatDate, formatMoney } from '../utils/format'
import { resolveCoverUrl } from '../../utils/coverUrl'
import { useDebouncedSearch } from '../hooks/useDebouncedSearch'
import StatCard from '../components/StatCard'

function Users() {
  const { user: currentUser } = useAuth()
  const [searchInput, search, onSearchChange] = useDebouncedSearch(350)
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [flash, setFlash] = useState({ tone: '', message: '' })
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [stats, setStats] = useState(null)
  const [detailUser, setDetailUser] = useState(null)
  const [userOrders, setUserOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')

  // Debounce handled by useDebouncedSearch; keep role filter in the URL-free state.

  const fetchStats = async () => {
    try {
      const res = await api.getUserStats()
      if (res.success) {
        setStats(res.data)
      }
    } catch {
      // Polling failures stay silent – the list still shows the last good data.
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch
    fetchStats()
  }, [])

  const { data, loading, error, reload } = useAsync(
    async () => {
      const res = await api.getAllUsers({ search: search || undefined, role: role || undefined, page, limit: 20 })
      if (!res.success) throw new Error(res.message || 'Failed to load users')
      return res.data
    },
    [search, role, page],
  )

  const users = data?.users ?? []
  const pagination = data?.pagination

  const onSearchChangeAndReset = (value) => {
    onSearchChange(value)
    setPage(1)
  }

  const openUserDetail = async (user) => {
    setDetailUser(user)
    setUserOrders([])
    setOrdersError('')
    setOrdersLoading(true)
    try {
      const [userRes, ordersRes] = await Promise.all([
        api.getUserById(user._id),
        api.getUserOrdersAdmin(user._id, { limit: 10 }),
      ])
      if (userRes.success) {
        setDetailUser(userRes.data.user)
      }
      if (ordersRes.success) {
        setUserOrders(ordersRes.data.orders || [])
      } else {
        setOrdersError(ordersRes.message || 'Could not load this customer\'s orders')
      }
    } catch (err) {
      setOrdersError(err?.message || 'Could not load this customer\'s orders')
    } finally {
      setOrdersLoading(false)
    }
  }

  const patchUser = async (user, patch, successMessage) => {
    setBusyId(user._id)
    try {
      const res = await api.updateUser(user._id, patch)
      if (res.success) {
        setFlash({ tone: 'success', message: successMessage })
        reload()
        fetchStats()
      } else {
        setFlash({ tone: 'error', message: res.message || 'Could not update the user' })
      }
    } catch (err) {
      setFlash({ tone: 'error', message: err.message || 'Could not update the user' })
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const res = await api.deleteUser(pendingDelete._id)
      if (res.success) {
        setFlash({ tone: 'success', message: `"${pendingDelete.name}" deleted` })
        setPendingDelete(null)
        reload()
        fetchStats()
      } else {
        setFlash({ tone: 'error', message: res.message || 'Could not delete the user' })
      }
    } catch (err) {
      setFlash({ tone: 'error', message: err.message || 'Could not delete the user' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage registered customer and admin accounts
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats?.totalUsers} icon={faUser} color="blue" />
        <StatCard title="Customers" value={stats?.customerAccounts} icon={faUser} color="green" />
        <StatCard title="Administrators" value={stats?.adminAccounts} icon={faUserShield} color="purple" />
        <StatCard title="New (7 days)" value={stats?.recentUsers} icon={faUserPlus} color="orange" />
      </div>

      <Alert tone={flash.tone} message={flash.message} onDismiss={() => setFlash({ tone: '', message: '' })} />

      <Toolbar>
        <div className="relative flex-1 sm:max-w-sm">
          <FontAwesomeIcon icon={faSearch} className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-500" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => onSearchChangeAndReset(e.target.value)}
            aria-label="Search users"
            placeholder="Search by name or email"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value)
            setPage(1)
          }}
          aria-label="Filter by role"
          className={`${inputClass} sm:max-w-48`}
        >
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="admin">Admins</option>
        </select>
      </Toolbar>

      {loading ? (
        <Spinner label="Loading users..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : users.length === 0 ? (
        <EmptyState title="No customer accounts have been registered yet" hint="Users will appear here once they register." />
      ) : (
        <>
          <Table head={['User', 'Role', 'Joined', 'Status', 'Actions']}>
            {users.map((u) => {
              const isSelf = currentUser?.id === u._id
              return (
                <tr key={u._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                        {u.avatar ? (
                          <img src={resolveCoverUrl(u.avatar)} alt={u.name} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <FontAwesomeIcon icon={faUser} />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700">
                          {u.name}
                          {isSelf && <span className="ml-2 text-[10px] font-bold text-[#2563EB] uppercase">You</span>}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={u.role} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={u.isActive === false ? 'inactive' : 'active'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => openUserDetail(u)}
                      >
                        <FontAwesomeIcon icon={faEye} className="mr-1" />
                        View Details
                      </Button>
                      <Button
                        variant="ghost"
                        busy={busyId === u._id}
                        disabled={isSelf}
                        onClick={() =>
                          patchUser(
                            u,
                            { isActive: u.isActive === false },
                            u.isActive === false ? 'Account reactivated' : 'Account deactivated',
                          )
                        }
                      >
                        {u.isActive === false ? 'Activate' : 'Deactivate'}
                      </Button>
                      <Button
                        variant="ghost"
                        busy={busyId === u._id}
                        disabled={isSelf}
                        onClick={() =>
                          patchUser(
                            u,
                            { role: u.role === 'admin' ? 'customer' : 'admin' },
                            u.role === 'admin' ? 'Demoted to customer' : 'Promoted to admin',
                          )
                        }
                      >
                        {u.role === 'admin' ? 'Make customer' : 'Make admin'}
                      </Button>
                      <Button
                        variant="danger"
                        busy={deleting && pendingDelete?._id === u._id}
                        disabled={isSelf}
                        onClick={() => setPendingDelete(u)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </Table>

          <Pagination page={page} totalPages={pagination?.totalPages ?? 1} onChange={setPage} />
        </>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete user"
          message={`"${pendingDelete.name}" will be permanently deleted. Their order history stays on record. This cannot be undone.`}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {detailUser && (
        <Modal title="User Details" onClose={() => setDetailUser(null)} wide>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-2xl">
                {detailUser.avatar ? (
                  <img src={resolveCoverUrl(detailUser.avatar)} alt={detailUser.name} className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <FontAwesomeIcon icon={faUser} />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{detailUser.name}</h3>
                <p className="text-slate-600">{detailUser.email}</p>
                <div className="mt-2 flex gap-2">
                  <StatusBadge value={detailUser.role} />
                  <StatusBadge value={detailUser.isActive === false ? 'inactive' : 'active'} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-2">Account Information</p>
                <p className="text-sm text-slate-600">Registration Date: {formatDate(detailUser.createdAt)}</p>
                {detailUser.username && <p className="text-sm text-slate-600">Username: {detailUser.username}</p>}
                {detailUser.phone && <p className="text-sm text-slate-600">Phone: {detailUser.phone}</p>}
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-2">Order Statistics</p>
                <p className="text-sm text-slate-600">Total Orders: {formatNumber(detailUser.orderCount || 0)}</p>
                <p className="text-sm text-slate-600">Total Spending: {formatMoney(detailUser.totalSpent || 0)}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase">Recent Order History</p>
              {ordersLoading ? (
                <Spinner label="Loading orders..." />
              ) : ordersError ? (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {ordersError}
                </p>
              ) : userOrders.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No orders found for this customer.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Order</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Status</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {userOrders.map((order) => (
                        <tr key={order._id}>
                          <td className="px-4 py-2 text-sm font-medium text-slate-700">#{String(order.orderNumber || order._id).slice(-8)}</td>
                          <td className="px-4 py-2 text-sm text-slate-600">{formatDate(order.createdAt)}</td>
                          <td className="px-4 py-2"><StatusBadge value={order.status} /></td>
                          <td className="px-4 py-2 text-right text-sm font-semibold text-slate-700">{formatMoney(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setDetailUser(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Users
