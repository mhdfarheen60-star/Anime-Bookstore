import { lazy, Suspense } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import Preloader from './components/Preloader'
import ScrollToTop from './components/ScrollToTop'
import UserLayout from './user/components/UserLayout'
import { ProtectedRoute, AdminRoute, GuestRoute } from './components/RouteGuards'

// Each page becomes its own chunk, so the first visit only downloads what it needs.
const Home = lazy(() => import('./user/pages/Home'))
const AllBooks = lazy(() => import('./user/pages/AllBooks'))
const ViewBook = lazy(() => import('./user/pages/ViewBook'))
const Contact = lazy(() => import('./user/pages/Contact'))
const Profile = lazy(() => import('./user/pages/Profile'))
const Cart = lazy(() => import('./user/pages/Cart'))
const SeriesIndex = lazy(() => import('./user/pages/SeriesIndex'))
const Series = lazy(() => import('./user/pages/Series'))
const Wishlist = lazy(() => import('./user/pages/Wishlist'))
const Blog = lazy(() => import('./user/pages/Blog'))
const BlogPost = lazy(() => import('./user/pages/BlogPost'))
const About = lazy(() => import('./user/pages/About'))
const Authors = lazy(() => import('./user/pages/Authors'))
const Faq = lazy(() => import('./user/pages/Faq'))
const Guides = lazy(() => import('./user/pages/Guides'))
const Shipping = lazy(() => import('./user/pages/Shipping'))
const Privacy = lazy(() => import('./user/pages/Privacy'))
const Terms = lazy(() => import('./user/pages/Terms'))
const Refund = lazy(() => import('./user/pages/Refund'))
const Sitemap = lazy(() => import('./user/pages/Sitemap'))
const Auth = lazy(() => import('./pages/Auth'))
const Pnf = lazy(() => import('./pages/Pnf'))

// Admin modules
const AdminLayout = lazy(() => import('./admin/components/AdminLayout'))
const Dashboard = lazy(() => import('./admin/pages/Dashboard'))
const AdminBooks = lazy(() => import('./admin/pages/Books'))
const AdminBlog = lazy(() => import('./admin/pages/Blog'))
const AdminCategories = lazy(() => import('./admin/pages/Categories'))
const AdminOrders = lazy(() => import('./admin/pages/Orders'))
const AdminUsers = lazy(() => import('./admin/pages/Users'))
const AdminMessages = lazy(() => import('./admin/pages/Messages'))
const Resource = lazy(() => import('./admin/pages/Resource'))
const Settings = lazy(() => import('./admin/pages/Settings'))

function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Preloader />}>
        <Routes>
          {/* Public pages share the header + footer */}
          <Route element={<UserLayout />}>
            <Route index element={<Home />} />
            <Route path="all-books" element={<AllBooks />} />
            <Route path="view/:id/book" element={<ViewBook />} />
            <Route path="series" element={<SeriesIndex />} />
            <Route path="series/:name" element={<Series />} />
            <Route path="contact" element={<Contact />} />
            <Route path="blog" element={<Blog />} />
            <Route path="blog/:slug" element={<BlogPost />} />
            <Route path="about" element={<About />} />
            <Route path="authors" element={<Authors />} />
            <Route path="faq" element={<Faq />} />
            <Route path="guides" element={<Guides />} />
            <Route path="shipping-returns" element={<Shipping />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="refund-policy" element={<Refund />} />
            <Route path="sitemap" element={<Sitemap />} />
            <Route
              path="wishlist"
              element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Full-screen pages: no shared header/footer */}
          <Route
            path="login"
            element={
              <GuestRoute>
                <Auth key="login" mode="login" />
              </GuestRoute>
            }
          />
          <Route
            path="signup"
            element={
              <GuestRoute>
                <Auth key="signup" mode="signup" />
              </GuestRoute>
            }
          />

          {/* Admin panel — every route requires the admin role */}
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="books" element={<AdminBooks />} />
            <Route path="blog" element={<AdminBlog />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="resource" element={<Resource />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Legacy admin URLs kept working */}
          <Route path="admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="admin-messages" element={<Navigate to="/admin/messages" replace />} />
          <Route path="admin-resource" element={<Navigate to="/admin/resource" replace />} />
          <Route path="admin-settings" element={<Navigate to="/admin/settings" replace />} />

          <Route path="*" element={<Pnf />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
