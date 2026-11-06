import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useCart } from '../../context/useCart'
import { useWishlist } from '../../context/useWishlist'
import Wordmark from '../../components/Wordmark'
import { resolveCoverUrl } from '../../utils/coverUrl'
import SearchPanel from './SearchPanel'

const menuLinks = [
  { name: 'Home', to: '/', end: true },
  { name: 'Manga', to: '/all-books?genre=Manga' },
  { name: 'Light Novels', to: '/all-books?genre=Light%20Novels' },
  { name: 'Books', to: '/all-books' },
  { name: 'Series', to: '/series' },
  { name: 'Contact', to: '/contact' },
]

const Icon = {
  search: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  bag: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <path d="M5 8h14l-1.2 12H6.2L5 8Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
      <circle cx="12" cy="8.5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 20c1.2-3.6 4-5.2 7-5.2s5.8 1.6 7 5.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
}

const iconButton = 'relative grid h-11 w-11 place-items-center text-moon/80 transition-colors duration-300 hover:text-moon'

function Badge({ count }) {
  if (!count) return null
  // Keyed by count so the pop animation replays on every change.
  return (
    <span key={count} className="animate-pop absolute top-1 right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sakura px-1 text-[10px] font-bold text-white tabular-nums">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function UserHeader() {
  const { pathname } = useLocation()
  const { user, logout, isAuthenticated, isAdmin } = useAuth()
  const { cart, ready: cartReady } = useCart()
  const { count: wishlistCount } = useWishlist()
  const [scrolled, setScrolled] = useState(() => window.scrollY > 24)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const menuButtonRef = useRef(null)
  const menuRef = useRef(null)
  const closeRef = useRef(null)

  // Close overlays whenever the route changes (including browser back/forward).
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setMenuOpen(false)
    setSearchOpen(false)
    setProfileOpen(false)
  }

  // Ripple on the cart icon when the item count goes up after the first load.
  const itemCount = cart.itemCount || 0
  const [seenCount, setSeenCount] = useState(null)
  const [cue, setCue] = useState(0)
  if (cartReady && itemCount !== seenCount) {
    if (seenCount !== null && itemCount > seenCount) setCue((n) => n + 1)
    setSeenCount(itemCount)
  }

  // One passive scroll listener, at most one state change per frame.
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        setScrolled(window.scrollY > 24)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  // Close profile dropdown on outside click.
  useEffect(() => {
    if (!profileOpen) return undefined
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [profileOpen])
  useEffect(() => {
    if (!menuOpen && !searchOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen, searchOpen])

  // Mobile menu: lock page scroll, move focus in, trap Tab, restore focus on close.
  useEffect(() => {
    if (!menuOpen) return undefined
    const opener = menuButtonRef.current
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const trap = (e) => {
      if (e.key !== 'Tab' || !menuRef.current) return
      const items = menuRef.current.querySelectorAll('a[href], button:not([disabled])')
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', trap)
      opener?.focus()
    }
  }, [menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
  }

  const solid = scrolled || searchOpen

  return (
    <header className="arrive-nav sticky top-0 z-50 text-moon">
      <div
        aria-hidden="true"
        className={`absolute inset-0 border-b bg-ink/80 backdrop-blur-xl transition-opacity duration-500 ${solid ? 'border-line opacity-100' : 'border-transparent opacity-0'}`}
      />
      <div className="shell relative flex h-[72px] items-center justify-between gap-6">
        <Link to="/" aria-label="Book Store home" className="inline-flex min-h-11 shrink-0 items-center">
          <span className="hidden sm:inline"><Wordmark /></span>
          <span className="sm:hidden"><Wordmark compact /></span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-10 lg:flex">
          {menuLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="inline-flex min-h-11 items-center text-sm text-moon/75 transition-colors hover:text-moon aria-[current=page]:text-moon">
              <span className="nav-link">{link.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={() => { setMenuOpen(false); setSearchOpen((open) => !open) }}
            aria-expanded={searchOpen}
            aria-label={searchOpen ? 'Close search' : 'Search books'}
            className={iconButton}
          >
            {Icon.search}
          </button>
          <Link to="/wishlist" aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} saved` : ''}`} className={iconButton}>
            {Icon.heart}
            <Badge count={wishlistCount} />
          </Link>
          <Link to="/cart" aria-label={`Cart${itemCount ? `, ${itemCount} items` : ''}`} className={iconButton}>
            <span key={cue} className={cue ? 'cue-ring' : ''}>{Icon.bag}</span>
            <Badge count={itemCount} />
          </Link>

          <div className="ml-4 hidden items-center gap-6 text-sm lg:flex">
            {isAuthenticated ? (
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((o) => !o)}
                  className="inline-flex min-h-11 items-center gap-2 text-moon/75 hover:text-moon"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-line bg-surface">
                    {user?.avatar ? (
                      <img src={resolveCoverUrl(user.avatar)} alt={user?.name || 'Profile'} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-moon">{(user?.name || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="nav-link truncate max-w-32">{user?.name || 'Account'}</span>
                  <span className="text-moon/60">▼</span>
                </button>
                {profileOpen && (
                  <div role="menu" className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-line bg-panel/95 backdrop-blur-xl p-4 shadow-xl text-moon z-50">
                    <div className="flex items-center gap-3 pb-3 border-b border-line">
                      <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-line bg-surface">
                        {user?.avatar ? (
                          <img src={resolveCoverUrl(user.avatar)} alt={user?.name || 'Profile'} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-moon">{(user?.name || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-moon truncate">{user?.name || 'Account'}</p>
                        <p className="text-xs text-moon/60 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-1 text-sm">
                      <Link to="/profile" onClick={() => setProfileOpen(false)} className="rounded-lg px-3 py-2 transition-colors hover:bg-surface hover:text-electric">My Profile</Link>
                      <Link to="/wishlist" onClick={() => setProfileOpen(false)} className="rounded-lg px-3 py-2 transition-colors hover:bg-surface hover:text-electric">Wishlist</Link>
                      <button type="button" onClick={async () => { setProfileOpen(false); await logout() }} className="rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface hover:text-electric">Logout</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <NavLink to="/login" className="inline-flex min-h-11 items-center text-moon/75 hover:text-moon"><span className="nav-link">Sign in</span></NavLink>
            )}
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => { setSearchOpen(false); setMenuOpen(true) }}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label="Open menu"
            className={`${iconButton} lg:hidden`}
          >
            <span aria-hidden="true" className="flex w-5 flex-col gap-1.5">
              <span className="h-px w-full bg-current" />
              <span className="h-px w-3/5 self-end bg-current" />
            </span>
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="absolute inset-x-0 top-full">
          {/* Dims the page; clicking it closes search. Keyboard users have Escape and the Close button. */}
          <div aria-hidden="true" onClick={() => setSearchOpen(false)} className="drop-in fixed inset-0 top-[72px] -z-10 bg-black/25" />
          <SearchPanel onClose={() => setSearchOpen(false)} />
        </div>
      )}

      {menuOpen && (
        <div
          ref={menuRef}
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="curtain-in fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-ink text-moon"
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-1/4 -bottom-1/4 h-[70vmax] w-[70vmax] rounded-full bg-violet/10 blur-3xl" />
          <div className="shell relative flex h-[72px] shrink-0 items-center justify-between">
            <Wordmark compact />
            <button ref={closeRef} type="button" onClick={() => setMenuOpen(false)} className="min-h-11 px-2 text-sm text-mist hover:text-moon">
              Close <span className="sr-only">menu</span>
            </button>
          </div>

          <nav aria-label="Main" className="shell relative flex flex-1 flex-col justify-center gap-2 py-10">
            {menuLinks.map((link, i) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMenuOpen(false)}
                className="stagger-in flex items-baseline gap-5 py-1 font-display text-[clamp(2.75rem,13vw,5.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em] text-moon/85 aria-[current=page]:text-electric"
                style={{ '--i': i }}
              >
                <span className="eyebrow font-sans text-mist">0{i + 1}</span>
                {link.name}
              </NavLink>
            ))}
          </nav>

          <div className="shell relative flex flex-wrap gap-x-8 gap-y-2 border-t border-line py-8 text-sm text-mist">
            {isAuthenticated ? (
              <>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="min-h-11 content-center hover:text-moon">Account</Link>
                <Link to="/wishlist" onClick={() => setMenuOpen(false)} className="min-h-11 content-center hover:text-moon">Wishlist</Link>
                <Link to="/cart" onClick={() => setMenuOpen(false)} className="min-h-11 content-center hover:text-moon">Cart</Link>
                {isAdmin && <Link to="/admin/dashboard" onClick={() => setMenuOpen(false)} className="min-h-11 content-center hover:text-moon">Admin</Link>}
                <button type="button" onClick={handleLogout} className="min-h-11 hover:text-moon">Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="min-h-11 content-center hover:text-moon">Sign in</Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="min-h-11 content-center hover:text-moon">Create account</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default UserHeader
