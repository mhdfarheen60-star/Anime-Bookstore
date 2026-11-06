import { BookOpen, ShoppingCart, TrendingUp, Users, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useAsync } from '../hooks/useAsync'
import { EmptyState, ErrorState, Spinner, StatusBadge } from '../components/Ui'
import { formatMoney, formatNumber, formatDate, shortLabel } from '../utils/format'

// ---- Small building blocks ----

function Panel({ eyebrow, title, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[1.3px] text-slate-500">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-bold">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function StatCard({ label, value, icon: Icon, tint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-wide text-slate-500">{label}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
          <Icon size={18} />
        </div>
      </div>
      <h2 className="mt-5 text-3xl font-bold">{value}</h2>
    </div>
  )
}

// CSS bar chart — no chart dependency, matching the rest of the panel.
function BarChart({ series }) {
  const max = Math.max(1, ...series.map((d) => d.value))

  return (
    <div className="flex h-56 items-end gap-2 overflow-x-auto pb-1">
      {series.map((d, i) => (
        <div key={d.key} className="flex h-full min-w-9 flex-1 flex-col items-center justify-end gap-2">
          <span className="text-[10px] font-semibold text-slate-500" title={`${d.label}: ${d.value}`}>
            {d.value > 0 ? formatNumber(d.value) : ''}
          </span>
          <div
            style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
            className={`w-full rounded-t-md transition-colors ${
              i === series.length - 1 ? 'bg-[#2563EB]' : 'bg-[#bfdbfe] hover:bg-[#2563EB]'
            }`}
          />
          <span className="text-[10px] whitespace-nowrap text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// Revenue doesn't share a scale with order counts, so it gets its own sparkline.
function LineChart({ series }) {
  const max = Math.max(1, ...series.map((d) => d.value))
  const points = series.map((d, i) => {
    const x = series.length === 1 ? 50 : (i / (series.length - 1)) * 100
    const y = 100 - (d.value / max) * 100
    return `${x},${y}`
  })

  return (
    <div className="h-56">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Revenue trend">
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#eef1f6" strokeWidth="0.5" />
        ))}
        <polygon points={`0,100 ${points.join(' ')} 100,100`} fill="url(#revFill)" />
        <polyline points={points.join(' ')} fill="none" stroke="#2563EB" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      {series.length > 1 && (
        <div className="mt-2 flex justify-between text-[10px] text-slate-500">
          <span>{series[0].label}</span>
          <span>{series[series.length - 1].label}</span>
        </div>
      )}
    </div>
  )
}

// Category distribution as a conic-gradient donut.
function CategoryDonut({ stats }) {
  const total = stats.reduce((sum, c) => sum + c.bookCount, 0)
  if (!total) return <p className="py-8 text-center text-sm text-slate-500">No categories yet.</p>

  const palette = ['#2563EB', '#7c8ff0', '#a5b4f7', '#c9d3fb', '#e3e9fe', '#94a3b8']

  // Precompute each segment's start offset up front, then build the gradient
  // from it, so the mapping step is pure.
  const offsets = stats.reduce((acc, c) => {
    acc.running += (c.bookCount / total) * 100
    acc.starts.push(acc.running)
    return acc
  }, { starts: [], running: 0 }).starts

  const stops = stats.map((c, i) => {
    const from = i === 0 ? 0 : offsets[i - 1]
    return `${palette[i % palette.length]} ${from}% ${offsets[i]}%`
  })

  return (
    <div className="flex flex-col items-center justify-center gap-8 sm:flex-row">
      <div
        className="flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
      >
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
          <strong className="text-xl">{formatNumber(total)}</strong>
          <span className="mt-1 text-[11px] text-slate-500">Books</span>
        </div>
      </div>
      <ul className="w-full space-y-3">
        {stats.slice(0, 6).map((c, i) => (
          <li key={c._id || c.slug || i} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: palette[i % palette.length] }} />
            <span className="flex-1 truncate text-xs font-semibold">{c.name}</span>
            <span className="text-[10px] text-slate-500">{c.bookCount}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Dashboard() {
  const { data, loading, error, reload } = useAsync(async () => {
    const res = await api.getDashboardStats()
    if (!res.success) throw new Error(res.message || 'Failed to load dashboard')
    return res.data
  }, [])

  if (loading) return <Spinner label="Loading dashboard..." />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!data) return <EmptyState title="No dashboard data" hint="The API returned an empty response." />

  const {
    overview = {},
    lowStockBooks = [],
    recentOrders = [],
    bestSellingBooks = [],
    categoryStats = [],
    salesByDay = [],
    salesByMonth = [],
  } = data

  const dailySeries = salesByDay.slice(-30).map((d) => ({
    key: d._id,
    label: shortLabel(d._id),
    value: d.orders,
  }))
  const monthlySeries = salesByMonth.map((d) => ({
    key: d._id,
    label: shortLabel(d._id),
    value: d.revenue,
  }))

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="mb-1 text-[11px] font-bold tracking-[1.5px] text-slate-500">ADMIN DASHBOARD</p>
          <h1 className="text-2xl font-bold sm:text-3xl">System Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your bookstore, monitor activity and track performance.</p>
        </div>
        <div className="lg:text-right">
          <p className="text-[11px] text-slate-500">Today</p>
          <p className="mt-1 text-sm font-semibold">
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="TOTAL BOOKS" value={formatNumber(overview.totalBooks)} icon={BookOpen} tint="bg-[#edf2ff] text-[#2563EB]" />
        <StatCard label="TOTAL USERS" value={formatNumber(overview.totalUsers)} icon={Users} tint="bg-emerald-50 text-emerald-700" />
        <StatCard label="TOTAL ORDERS" value={formatNumber(overview.totalOrders)} icon={ShoppingCart} tint="bg-orange-50 text-orange-600" />
        <StatCard label="REVENUE" value={formatMoney(overview.totalRevenue)} icon={TrendingUp} tint="bg-purple-50 text-purple-600" />
      </div>

      {overview.lowStockCount > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <TriangleAlert className="mt-0.5 shrink-0 text-amber-700" size={18} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {overview.lowStockCount} book{overview.lowStockCount > 1 ? 's' : ''} running low on stock
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              {overview.pendingOrders > 0
                ? `${formatNumber(overview.pendingOrders)} order(s) still awaiting fulfilment.`
                : 'No orders are currently pending.'}
            </p>
          </div>
          <Link to="/admin/books" className="shrink-0 text-xs font-semibold text-amber-800 underline hover:no-underline">
            Manage stock
          </Link>
        </div>
      )}

      <div className="mb-5 grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Panel eyebrow="SALES ANALYTICS" title="Orders per day" action={<span className="text-xs text-slate-500">Last 30 days</span>}>
          {dailySeries.length ? (
            <BarChart series={dailySeries} />
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">No orders in the last 30 days.</p>
          )}
        </Panel>

        <Panel eyebrow="CATALOGUE" title="Books per category">
          <CategoryDonut stats={categoryStats} />
        </Panel>
      </div>


      <div className="mb-5 grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Panel eyebrow="REVENUE" title="Revenue per month" action={<span className="text-xs text-slate-500">Last 12 months</span>}>
          {monthlySeries.length ? (
            <LineChart series={monthlySeries} />
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">No revenue recorded yet.</p>
          )}
        </Panel>

        <Panel
          eyebrow="BEST SELLERS"
          title="Top books"
          action={
            <Link to="/admin/books" className="text-xs font-semibold text-[#2563EB] hover:underline">
              View all
            </Link>
          }
        >
          {bestSellingBooks.length ? (
            <ol className="space-y-4">
              {bestSellingBooks.slice(0, 6).map((b, i) => (
                <li key={b._id || i} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#edf1ff] text-xs font-bold text-[#2563EB]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{b.title}</p>
                    <p className="text-[10px] text-slate-500">{formatNumber(b.totalSold)} sold</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-600">{formatMoney(b.revenue)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">No sales yet.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Panel
          eyebrow="RECENT ACTIVITY"
          title="Latest orders"
          action={
            <Link to="/admin/orders" className="text-xs font-semibold text-[#2563EB] hover:underline">
              View all
            </Link>
          }
        >
          {recentOrders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="pb-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase">Order</th>
                    <th className="pb-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase">Customer</th>
                    <th className="pb-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase">Date</th>
                    <th className="pb-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase">Status</th>
                    <th className="pb-2 text-right text-[11px] font-bold tracking-wide text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((o) => (
                    <tr key={o._id}>
                      <td className="py-2.5 font-medium">#{String(o.orderNumber || o._id).slice(-8)}</td>
                      <td className="py-2.5 text-slate-600">{o.user?.name || 'Unknown'}</td>
                      <td className="py-2.5 text-slate-500">{formatDate(o.createdAt)}</td>
                      <td className="py-2.5">
                        <StatusBadge value={o.status} />
                      </td>
                      <td className="py-2.5 text-right font-semibold">{formatMoney(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">No orders yet.</p>
          )}
        </Panel>

        <Panel eyebrow="INVENTORY" title="Low stock alert">
          {lowStockBooks.length ? (
            <ul className="space-y-4">
              {lowStockBooks.map((b) => (
                <li key={b._id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{b.title}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      b.stock === 0 ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-700 ring-amber-200'
                    }`}
                  >
                    {b.stock} left
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">Every book is comfortably stocked.</p>
          )}
        </Panel>
      </div>
    </>
  )
}

export default Dashboard

