import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { formatNumber } from '../utils/format'

const COLOR_CLASSES = {
  blue: 'bg-blue-50 text-blue-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  purple: 'bg-purple-50 text-purple-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  orange: 'bg-orange-50 text-orange-600',
}

/**
 * Admin summary tile. Pass `value` as undefined while stats are loading – the
 * card renders an em dash instead of a misleading 0.
 */
export default function StatCard({ title, value, icon, color }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {value === undefined || value === null ? '—' : formatNumber(value)}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${COLOR_CLASSES[color] || COLOR_CLASSES.blue}`}>
          <FontAwesomeIcon icon={icon} />
        </div>
      </div>
    </div>
  )
}
