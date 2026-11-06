import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/useAuth'
import { resolveCoverUrl } from '../../utils/coverUrl'

// Top bar of the admin panel. `onMenu` opens the drawer on small screens.
function AdminHeader({ onMenu }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login')
  }

  const avatar = user?.avatar ? resolveCoverUrl(user.avatar) : ''

  return (
    <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open admin menu"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
        <Link to="/" className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-[#2563EB]">
          <FontAwesomeIcon icon={faChevronLeft} />
          <span className="hidden sm:inline">Back to store</span>
        </Link>
      </div>

      <div ref={ref} className="relative flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-slate-50"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">{user?.name || 'Admin'}</p>
            <p className="text-[11px] text-slate-600">Administrator</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#dbeafe] text-sm font-bold text-[#2563EB]">
            {avatar ? <img src={avatar} alt={user?.name || 'Admin'} className="h-full w-full object-cover" /> : (user?.name || 'A').charAt(0).toUpperCase()}
          </span>
        </button>
        {open && (
          <div role="menu" className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <div className="mt-1 flex flex-col text-sm">
              <Link to="/admin/dashboard" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50">Dashboard</Link>
              <Link to="/admin/settings" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50">Account Settings</Link>
              <button type="button" onClick={handleLogout} className="rounded-lg px-3 py-2 text-left text-slate-700 hover:bg-slate-50">Logout</button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default AdminHeader
