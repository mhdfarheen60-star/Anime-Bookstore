// Where each role lands after signing in, so an admin is not dumped on the
// customer profile page. Kept separate so RouteGuards.jsx only exports
// components (required for fast refresh).
export const homeForRole = (role) => (role === 'admin' ? '/admin/dashboard' : '/profile')

export default homeForRole
