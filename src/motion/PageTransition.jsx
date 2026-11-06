import { useLocation } from 'react-router-dom'

/**
 * Plays a short fade/rise when the route changes. It only animates the new
 * page in after React Router has already navigated, so it never delays or
 * blocks navigation, and it doesn't touch browser history.
 */
function PageTransition({ children }) {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  )
}

export default PageTransition
