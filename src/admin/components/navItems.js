// Navigation model for the admin panel, kept separate from the Sidebar component
// so a component file only exports a component (required for fast refresh).
import {
  BookOpen,
  LayoutDashboard,
  Mail,
  Newspaper,
  ShoppingCart,
  Tags,
  Users,
  Settings,
} from 'lucide-react'

export const NAV_ITEMS = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Books', to: '/admin/books', icon: BookOpen },
  { label: 'Categories', to: '/admin/categories', icon: Tags },
  { label: 'Blog', to: '/admin/blog', icon: Newspaper },
  { label: 'Orders', to: '/admin/orders', icon: ShoppingCart },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Messages', to: '/admin/messages', icon: Mail },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
]

export default NAV_ITEMS
