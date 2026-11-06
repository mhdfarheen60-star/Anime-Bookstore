import { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faSearch, faShoppingCart, faClock, faSpinner, faTruck, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons'
import { api } from '../../api/client'
import { useAsync } from '../hooks/useAsync'
import { useDebouncedSearch } from '../hooks/useDebouncedSearch'
import StatCard from '../components/StatCard'
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  Pagination,
  Spinner,
  StatusBadge,
  Table,
  Toolbar,
  inputClass,
} from '../components/Ui'
import { formatMoney, formatDate } from '../utils/format'

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded']

function Orders() {
  const [searchInput, search, onSearchChange] = useDebouncedSearch(350)
  const [status, setStatus] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null) // order being inspected
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState({ tone: '', message: '' })
  const [stats, setStats] = useState(null)
  const pollingRef = useRef(null)

  const { data, loading, error, reload } = useAsync(
    async () => {
      const res = await api.getAllOrders({ 
        search: search || undefined, 
        status: status || undefined, 
        paymentStatus: paymentStatusFilter || undefined,
        page, 
        limit: 20,
        sort: 'createdAt',
        order: 'desc'
      })
      if (!res.success) throw new Error(res.message || 'Failed to load orders')
      return res.data
    },
    [search, status, paymentStatusFilter, page],
  )

  const fetchStats = async () => {
    try {
      const res = await api.getOrderStats()
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
    // Poll for new orders every 30 seconds
    pollingRef.current = setInterval(() => {
      reload()
      fetchStats()
    }, 30000)
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only polling
  }, [])

  const orders = data?.orders ?? []
  const pagination = data?.pagination

  const onSearchChangeAndReset = (value) => {
    onSearchChange(value)
    setPage(1)
  }

  const openDetail = async (order) => {
    setDetail(order)
    // Pull the full document so shipping address and line items are complete.
    try {
      const res = await api.getAdminOrderById(order._id)
      if (res.success) setDetail(res.data.order)
    } catch {
      setFlash({ tone: 'error', message: 'Could not load the full order details' })
    }
  }

  const updateStatus = async (patch) => {
    if (!detail) return
    setSaving(true)
    try {
      const res = await api.updateOrderStatus(detail._id, patch)
      if (res.success) {
        setFlash({ tone: 'success', message: 'Order updated successfully' })
        setDetail(res.data.order)
        reload()
        fetchStats()
      } else {
        setFlash({ tone: 'error', message: res.message || 'Could not update the order' })
      }
    } catch (err) {
      setFlash({ tone: 'error', message: err.message || 'Could not update the order' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Orders Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage and track all customer orders
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Orders" value={stats?.totalOrders} icon={faShoppingCart} color="blue" />
        <StatCard title="Pending" value={stats?.pendingOrders} icon={faClock} color="yellow" />
        <StatCard title="Processing" value={stats?.processingOrders} icon={faSpinner} color="purple" />
        <StatCard title="Shipped" value={stats?.shippedOrders} icon={faTruck} color="indigo" />
        <StatCard title="Delivered" value={stats?.deliveredOrders} icon={faCheckCircle} color="green" />
        <StatCard title="Cancelled" value={stats?.cancelledOrders} icon={faTimesCircle} color="red" />
      </div>

      <Alert tone={flash.tone} message={flash.message} onDismiss={() => setFlash({ tone: '', message: '' })} />

      <Toolbar>
        <div className="relative flex-1 sm:max-w-sm">
          <FontAwesomeIcon icon={faSearch} className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-slate-500" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => onSearchChangeAndReset(e.target.value)}
            aria-label="Search orders"
            placeholder="Search by order number, name or email"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          aria-label="Filter by order status"
          className={`${inputClass} sm:max-w-48`}
        >
          <option value="">All Order Status</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          value={paymentStatusFilter}
          onChange={(e) => {
            setPaymentStatusFilter(e.target.value)
            setPage(1)
          }}
          aria-label="Filter by payment status"
          className={`${inputClass} sm:max-w-48`}
        >
          <option value="">All Payment Status</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </Toolbar>

      {loading ? (
        <Spinner label="Loading orders..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          hint="Orders will appear here once customers place them."
        />
      ) : (
        <>
          <Table head={['Order', 'Customer', 'Items', 'Total', 'Payment Method', 'Payment Status', 'Order Status', 'Date', '']}>
            {orders.map((o) => (
              <tr key={o._id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-700">#{String(o.orderNumber || o._id).slice(-8)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-700">{o.user?.name || o.shippingAddress?.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{o.user?.email || ''}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{o.itemCount ?? o.items?.length ?? 0}</td>
                <td className="px-4 py-3 font-semibold text-slate-700">{formatMoney(o.total)}</td>
                <td className="px-4 py-3 text-slate-600 uppercase text-xs">{o.paymentMethod}</td>
                <td className="px-4 py-3">
                  <StatusBadge value={o.paymentStatus} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={o.status} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(o.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openDetail(o)}
                    aria-label={`View order ${String(o.orderNumber || o._id).slice(-8)}`}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </button>
                </td>
              </tr>
            ))}
          </Table>

          <Pagination page={page} totalPages={pagination?.totalPages ?? 1} onChange={setPage} />
        </>
      )}

      {detail && (
        <Modal title={`Order Details - #${String(detail.orderNumber || detail._id).slice(-8)}`} onClose={() => setDetail(null)} wide>
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">Order Date</p>
                <p className="mt-1 text-sm text-slate-700">{formatDate(detail.createdAt)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">Payment Method</p>
                <p className="mt-1 text-sm text-slate-700 uppercase">{detail.paymentMethod}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">Payment Status</p>
                <div className="mt-1">
                  <StatusBadge value={detail.paymentStatus} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">Order Status</p>
                <div className="mt-1">
                  <StatusBadge value={detail.status} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-2">Customer Information</p>
                <p className="text-sm font-semibold text-slate-700">{detail.user?.name || detail.shippingAddress?.name || 'Unknown'}</p>
                <p className="text-sm text-slate-600">{detail.user?.email || ''}</p>
                {detail.user?.phone && <p className="text-sm text-slate-600">{detail.user.phone}</p>}
              </div>
              {detail.shippingAddress && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-2">Shipping Address</p>
                  <p className="text-sm font-semibold text-slate-700">{detail.shippingAddress.name}</p>
                  <p className="text-sm text-slate-600">
                    {detail.shippingAddress.street}, {detail.shippingAddress.city},{' '}
                    {detail.shippingAddress.state} {detail.shippingAddress.zipCode}
                  </p>
                  <p className="text-sm text-slate-600">{detail.shippingAddress.country}</p>
                  <p className="mt-1 text-sm text-slate-500">{detail.shippingAddress.phone}</p>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase">Order Items</p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Book</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600">Quantity</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Unit Price</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(detail.items ?? []).map((item, i) => (
                      <tr key={item.book || i}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-700">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.author}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{formatMoney(item.price)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatMoney(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatMoney(detail.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Shipping Charges</span><span>{detail.shippingFee === 0 ? 'Free' : formatMoney(detail.shippingFee)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{formatMoney(detail.tax)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
                <span>Final Total</span><span>{formatMoney(detail.total)}</span>
              </div>
            </div>

            {(detail.razorpayOrderId || detail.razorpayPaymentId) && (
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-2">Razorpay Payment Details</p>
                {detail.razorpayOrderId && <p className="text-sm text-slate-600">Order ID: {detail.razorpayOrderId}</p>}
                {detail.razorpayPaymentId && <p className="text-sm text-slate-600">Payment ID: {detail.razorpayPaymentId}</p>}
              </div>
            )}

            {detail.paymentMethod === 'stripe' && (
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase mb-2">Stripe Payment Details</p>
                {detail.stripePaymentId && <p className="text-sm text-slate-600">Payment Intent ID: {detail.stripePaymentId}</p>}
              </div>
            )}

            <div className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
              <Field label="Update Order Status">
                <select
                  className={inputClass}
                  value={detail.status}
                  onChange={(e) => updateStatus({ status: e.target.value })}
                  disabled={saving}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Update Payment Status">
                <select
                  className={inputClass}
                  value={detail.paymentStatus}
                  onChange={(e) => updateStatus({ paymentStatus: e.target.value })}
                  disabled={saving}
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Orders
