import { Outlet } from 'react-router-dom'
import Footer from '../../components/Footer'
import PageTransition from '../../motion/PageTransition'
import UserHeader from './UserHeader'

// One header + one footer for every public page. Only the page content animates
// on navigation; the header and footer stay put.
function UserLayout() {
  return (
    <div className="surface-dark relative isolate flex min-h-screen flex-col bg-ink text-moon">
      {/* Faint drifting light + grain behind every public page (CSS only). */}
      <div aria-hidden="true" className="site-ambient">
        <div className="site-grain" />
      </div>
      <a href="#main" className="sr-only z-[90] bg-sakura px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <UserHeader />
      <main id="main" className="flex-1 overflow-x-clip">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
    </div>
  )
}

export default UserLayout
