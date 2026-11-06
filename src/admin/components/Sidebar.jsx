import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navItems'

const linkClass = ({ isActive }) =>
  `flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm transition ${
    isActive
      ? 'bg-[#eff6ff] font-semibold text-[#2563EB]'
      : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-[#2563EB]'
  }`

// Rendered by AdminLayout in both the desktop rail and the mobile drawer.
function Sidebar({ onNavigate }) {
  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
        <NavLink key={to} to={to} onClick={onNavigate} className={linkClass}>
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export default Sidebar
