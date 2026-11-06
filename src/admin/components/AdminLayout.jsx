import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AdminHeader from './AdminHeader'
import Sidebar from './Sidebar'

// Shell shared by every admin module: header + sidebar rail (drawer on mobile),
// with the matched page rendered through <Outlet />.
function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the drawer whenever the route changes. This is an external-system sync
  // (a modal's open state), not derived state, so the disable is intentional.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDrawerOpen(false), [pathname])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  return (
    <div className="surface-light min-h-screen bg-[#f6f8fc] text-[#17213c]">
      <AdminHeader onMenu={() => setDrawerOpen(true)} />

      <div className="mx-auto flex max-w-[100rem] gap-6 px-4 py-7 sm:px-6 lg:px-10">
        {/* Desktop rail */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <p className="mb-3 px-4 text-[11px] font-bold tracking-[1.3px] text-slate-600">MENU</p>
            <Sidebar />
          </div>
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button
              type="button"
              aria-label="Close admin menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/40"
            />
            <div className="relative z-10 w-64 bg-white px-4 py-6 shadow-xl">
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
