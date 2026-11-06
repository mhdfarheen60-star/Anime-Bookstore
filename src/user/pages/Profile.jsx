import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/useAuth'
import { api } from '../../api/client'
import { formatPrice } from '../../utils/format'
import { resolveCoverUrl } from '../../utils/coverUrl'

// The Book Details form sits on a white card inside the dark storefront, so the
// inputs carry their own dark text colour. Without it they inherit the page's
// light text and the typed values (and the placeholders) disappear.
const inputClass =
  'w-full rounded-md border border-line bg-surface p-3 text-moon outline-none transition placeholder:text-mist focus:border-sakura focus:bg-panel focus:ring-4 focus:ring-sakura/15'

function OrderRow({ order, onViewDetails }) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <article className="surface-light rounded-lg border border-line bg-panel p-6 text-moon shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold text-moon">Order #{order.orderNumber?.slice(-8) || order._id.slice(-8)}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-moon'}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
            <span className="text-sm text-mist">{formatDate(order.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm text-mist">
            {order.items.length} item{order.items.length > 1 ? 's' : ''} • {formatPrice(order.total)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onViewDetails(order)}
            className="px-4 py-2 rounded-lg border border-line text-sm font-medium text-moon/80 hover:bg-surface"
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}

const CANCELLABLE = ['pending', 'confirmed']

function OrderDetailsModal({ order, onClose, onCancelOrder, cancelling, cancelError }) {
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  if (!order) return null

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-moon/35 p-4 py-10"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Order #${String(order.orderNumber || order._id).slice(-8)}`}
        className="w-full max-w-2xl rounded-xl bg-panel text-moon shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="text-lg font-bold text-moon">
            Order #{String(order.orderNumber || order._id).slice(-8)}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-mist hover:text-moon/80">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-mist">Placed</p>
              <p className="mt-1 text-sm text-moon/80">{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-mist">Payment</p>
              <p className="mt-1 text-sm uppercase text-moon/80">{order.paymentMethod || 'cod'}</p>
              <p className="text-xs text-mist">{order.paymentStatus}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-mist">Status</p>
              <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-moon'}`}>
                {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
              </span>
            </div>
          </div>

          {order.shippingAddress && (
            <div className="rounded-lg border border-line p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-mist">Ship to</p>
              <p className="mt-1 text-sm font-semibold text-moon">{order.shippingAddress.name}</p>
              <p className="text-sm text-mist">
                {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
              </p>
              <p className="text-sm text-mist">{order.shippingAddress.country}</p>
              <p className="mt-1 text-sm text-mist">{order.shippingAddress.phone}</p>
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-mist">Items</p>
            <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-line">
              {(order.items ?? []).map((item, index) => (
                <li key={item.book || index} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-moon">{item.title}</p>
                    <p className="text-xs text-mist">{item.author}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm text-mist">{item.quantity} × {formatPrice(item.price)}</p>
                    <p className="text-sm font-semibold text-moon">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-surface p-4 text-sm text-moon/80">
            <div className="flex justify-between"><span className="text-mist">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-mist">Shipping</span><span>{order.shippingFee === 0 ? 'Free' : formatPrice(order.shippingFee)}</span></div>
            <div className="flex justify-between"><span className="text-mist">Tax</span><span>{formatPrice(order.tax)}</span></div>
            <div className="flex justify-between border-t border-line pt-2 font-bold"><span>Total</span><span>{formatPrice(order.total)}</span></div>
          </div>

          {cancelError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {cancelError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            {CANCELLABLE.includes(order.status) ? (
              confirmingCancel ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-moon/80">Cancel this order?</span>
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => onCancelOrder(order)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {cancelling ? 'Cancelling…' : 'Yes, cancel it'}
                  </button>
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => setConfirmingCancel(false)}
                    className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-moon/80 hover:bg-surface disabled:opacity-60"
                  >
                    Keep my order
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setConfirmingCancel(true); }}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Cancel order
                </button>
              )
            ) : (
              <span aria-hidden="true" />
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-moon/80 hover:bg-surface"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const EMPTY_ADDRESS = { street: '', city: '', state: '', zipCode: '', country: '' }
const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const BIO_MAX = 500

const formFromUser = (user) => ({
  name: user?.name || '',
  username: user?.username || '',
  bio: user?.bio || '',
  avatar: user?.avatar || '',
  address: { ...EMPTY_ADDRESS, ...user?.address },
})

function Avatar({ src, name, className = '' }) {
  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-full bg-gray-200 text-mist ${className}`}>
      {src ? <img src={src} alt={name || 'Profile picture'} className="h-full w-full object-cover" /> : <FontAwesomeIcon icon={faUser} />}
    </div>
  )
}

function Profile() {
  const { user, updateProfile, uploadAvatar, changePassword } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [activeOrder, setActiveOrder] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [paymentBanner, setPaymentBanner] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [messages, setMessages] = useState({ success: '', error: '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [profileForm, setProfileForm] = useState(() => formFromUser(user))
  // A newly chosen picture is held locally and only uploaded on Save, so
  // Cancel really discards it.
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!avatarFile) return undefined
    const url = URL.createObjectURL(avatarFile)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvatarPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  const openEditor = () => {
    setProfileForm(formFromUser(user))
    setAvatarFile(null)
    setAvatarPreview('')
    setMessages({ success: '', error: '' })
    setEditMode(true)
  }

  const closeEditor = () => {
    setAvatarFile(null)
    setAvatarPreview('')
    setEditMode(false)
  }

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!AVATAR_TYPES.includes(file.type)) {
      setMessages({ success: '', error: 'Choose a JPEG, PNG, WebP or GIF image.' })
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setMessages({ success: '', error: 'Profile picture must be 2 MB or smaller.' })
      return
    }
    setMessages({ success: '', error: '' })
    setAvatarFile(file)
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview('')
    setProfileForm((f) => ({ ...f, avatar: '' }))
  }

  const fetchOrders = async () => {
    setLoadingOrders(true);
    setOrdersError('');
    try {
      const response = await api.getMyOrders();
      if (response.success) {
        setOrders(response.data.orders);
      } else {
        setOrdersError(response.message || 'Could not load your orders');
      }
    } catch (error) {
      setOrdersError(error.message || 'Could not load your orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Load orders once the user is known. Guarded on the id so unrelated
  // re-renders (e.g. a profile save) do not refetch.
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Stripe Checkout redirects back here with ?session_id=... (success) or the
  // cart carries ?cancelled=1; also honour the legacy ?tab=history deep link.
  // Params are stripped from the URL once handled so a refresh stays quiet.
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const cancelled = searchParams.get('cancelled');
    const tab = searchParams.get('tab');
    if (!sessionId && !cancelled && tab !== 'history') return;

    if (sessionId) setPaymentBanner('Payment successful! Your order is being processed and will appear in your history shortly.');
    else if (cancelled) setPaymentBanner('Your payment was cancelled. Your cart is unchanged.');

    const next = new URLSearchParams(searchParams);
    next.delete('session_id');
    next.delete('cancelled');
    next.delete('tab');
    setSearchParams(next, { replace: true });

    document.getElementById('purchase-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // Close the order dialog with Escape.
  useEffect(() => {
    if (!activeOrder) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setActiveOrder(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeOrder]);

  // Pull fresh details when the modal opens so status/payment are current.
  const openOrderDetails = async (order) => {
    setCancelError('');
    setActiveOrder(order);
    try {
      const response = await api.getOrderById(order._id);
      if (response.success) setActiveOrder(response.data.order);
    } catch {
      // Keep the list-level data if the detail call fails.
    }
  };

  const handleCancelOrder = async (order) => {
    setCancelling(true);
    setCancelError('');
    try {
      const response = await api.cancelOrder(order._id);
      if (response.success) {
        const cancelled = response.data?.order ?? { ...order, status: 'cancelled' };
        setActiveOrder(cancelled);
        setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...cancelled } : o)));
      } else {
        setCancelError(response.message || 'Could not cancel the order');
      }
    } catch (error) {
      setCancelError(error.message || 'Could not cancel the order');
    } finally {
      setCancelling(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setMessages({ success: '', error: '' });
    setSaving(true);
    try {
      const payload = { ...profileForm, username: profileForm.username.trim().toLowerCase() };
      if (avatarFile) {
        const uploaded = await uploadAvatar(avatarFile);
        if (!uploaded.success) {
          setMessages({ success: '', error: uploaded.message });
          return;
        }
        // The upload already saved the new picture; sending the old value
        // here would overwrite it.
        delete payload.avatar;
      }
      const response = await updateProfile(payload);
      if (response.success) {
        setMessages({ success: 'Profile updated successfully', error: '' });
        closeEditor();
      } else {
        setMessages({ success: '', error: response.message });
      }
    } catch (error) {
      setMessages({ success: '', error: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessages({ success: '', error: '' });
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessages({ success: '', error: 'Passwords do not match' });
      return;
    }
    try {
      const response = await changePassword(passwordForm);
      if (response.success) {
        setMessages({ success: 'Password changed successfully', error: '' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessages({ success: '', error: response.message });
      }
    } catch (error) {
      setMessages({ success: '', error: error.message });
    }
  };

  return (
    <>
      {/* Cover + avatar */}
      <div className="h-50 w-full border-b border-line bg-[#eff6ff]" />
      <div className="mx-auto max-w-6xl px-6">
        <Avatar src={resolveCoverUrl(user?.avatar)} name={user?.name}
          className="-mt-20 h-40 w-40 border-4 border-white text-6xl sm:h-48 sm:w-48" />

        <div className="my-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-moon">{user?.name || 'User Name'}</h1>
            {user?.username && (
              <p className="text-mist">@{user.username}</p>
            )}
            {user?.bio && (
              <p className="mt-1 whitespace-pre-line wrap-break-word text-mist">{user.bio}</p>
            )}
          </div>
          <button
            type="button"
            onClick={editMode ? closeEditor : openEditor}
            aria-expanded={editMode}
            className="shrink-0 rounded-md bg-sakura px-5 py-2 text-white transition-colors hover:bg-[#2563EB]"
          >
            {editMode ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {paymentBanner && (
          <div role="status" className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            <span>{paymentBanner}</span>
            <button type="button" onClick={() => setPaymentBanner('')} aria-label="Dismiss" className="shrink-0 text-green-700 hover:text-green-900">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        )}
        {messages.success && (
          <div role="status" className="mb-4 p-4 rounded-lg bg-green-100 text-green-800">{messages.success}</div>
        )}
        {messages.error && (
          <div role="alert" className="mb-4 p-4 rounded-lg bg-red-100 text-red-800">{messages.error}</div>
        )}

        {editMode && (
          <div className="surface-light mb-8 rounded-lg border border-line bg-panel p-6 text-moon shadow-sm">
            <h2 className="mb-6 text-xl font-bold text-moon">Edit Profile</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-5">
              <div>
                <span className="mb-2 block font-semibold text-moon/80">Profile Picture</span>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar src={avatarPreview || resolveCoverUrl(profileForm.avatar)} name={profileForm.name}
                    className="h-24 w-24 shrink-0 text-4xl" />
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={saving}
                        className="rounded-lg bg-sakura px-4 py-2 text-sm text-white transition-colors hover:bg-[#2563EB] disabled:opacity-60">
                        Upload photo
                      </button>
                      {(avatarFile || profileForm.avatar) && (
                        <button type="button" onClick={removeAvatar} disabled={saving}
                          className="rounded-lg border border-line px-4 py-2 text-sm text-moon/80 hover:bg-surface disabled:opacity-60">
                          Remove
                        </button>
                      )}
                      <input ref={fileInputRef} type="file" accept={AVATAR_TYPES.join(',')} onChange={handleAvatarPick} className="hidden" />
                    </div>
                    {avatarFile ? (
                      <p className="text-sm text-mist">{avatarFile.name} will be uploaded when you save.</p>
                    ) : (
                      <input
                        type="url"
                        aria-label="Profile picture URL"
                        value={profileForm.avatar.startsWith('/uploads/') ? '' : profileForm.avatar}
                        onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                        className={inputClass}
                        placeholder="…or paste an image URL (https://…)"
                      />
                    )}
                    <p className="text-xs text-mist">JPEG, PNG, WebP or GIF, up to 2 MB.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="profile-name" className="mb-2 block font-semibold text-moon/80">Full Name</label>
                  <input
                    id="profile-name"
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className={inputClass}
                    required
                    minLength={2}
                    maxLength={50}
                  />
                </div>
                <div>
                  <label htmlFor="profile-username" className="mb-2 block font-semibold text-moon/80">Username</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-mist">@</span>
                    <input
                      id="profile-username"
                      type="text"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value.toLowerCase() })}
                      className={`${inputClass} pl-8`}
                      placeholder="your_username"
                      minLength={3}
                      maxLength={30}
                      pattern="[a-z0-9_]+"
                      title="3-30 characters: lowercase letters, numbers and underscores"
                      autoComplete="username"
                    />
                  </div>
                  <p className="mt-1 text-xs text-mist">3-30 characters: lowercase letters, numbers, underscores.</p>
                </div>
              </div>

              <div>
                <label htmlFor="profile-bio" className="mb-2 block font-semibold text-moon/80">Bio</label>
                <textarea
                  id="profile-bio"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Tell us about yourself"
                  maxLength={BIO_MAX}
                />
                <p className="mt-1 text-right text-xs text-mist">{profileForm.bio.length}/{BIO_MAX}</p>
              </div>

              <div className="border-t border-line pt-4">
                <h3 className="mb-4 font-semibold text-moon/80">Shipping Address</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    ['street', 'Street'],
                    ['city', 'City'],
                    ['state', 'State'],
                    ['zipCode', 'ZIP Code'],
                    ['country', 'Country'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label htmlFor={`address-${key}`} className="mb-2 block font-semibold text-moon/80">{label}</label>
                      <input
                        id={`address-${key}`}
                        type="text"
                        value={profileForm.address[key]}
                        onChange={(e) => setProfileForm({ ...profileForm, address: { ...profileForm.address, [key]: e.target.value } })}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-line pt-4">
                <button type="button" onClick={closeEditor} disabled={saving}
                  className="rounded-lg border border-line px-6 py-2 text-moon/80 hover:bg-surface disabled:opacity-60">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-sakura px-6 py-2 text-white transition-colors hover:bg-[#2563EB] disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        <p className="mt-5 leading-7 text-mist">
          {user?.email}
        </p>

        <div className="mx-auto mb-12 max-w-262.5 space-y-8 px-4">
          {/* My Orders */}
          <section className="surface-light rounded-lg border border-line bg-panel p-6 text-moon shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-moon">My Orders</h2>
            {loadingOrders ? (
              <div className="text-center py-8 text-mist">Loading orders...</div>
            ) : ordersError ? (
              <div className="text-center py-8">
                <p role="alert" className="text-red-700">{ordersError}</p>
                <button type="button" onClick={fetchOrders} className="mt-3 rounded-lg border border-line px-4 py-2 text-sm text-moon/80 hover:bg-surface">
                  Try again
                </button>
              </div>
            ) : orders.length > 0 ? (
              <>
                <div className="space-y-4">
                  {orders.slice(0, 3).map((order) => (
                    <OrderRow key={order._id} order={order} onViewDetails={openOrderDetails} />
                  ))}
                </div>
                {orders.length > 3 && (
                  <a href="#purchase-history" className="mt-4 inline-block font-medium text-electric hover:underline">View All Orders</a>
                )}
              </>
            ) : (
              <p className="text-center text-mist py-8">You haven't placed any orders yet.</p>
            )}
          </section>

          {/* Purchase History */}
          <section id="purchase-history" className="surface-light rounded-lg border border-line bg-panel p-6 text-moon shadow-sm scroll-mt-24">
            <h2 className="mb-4 text-xl font-bold text-moon">Purchase History</h2>
            {loadingOrders ? (
              <div className="text-center py-8 text-mist">Loading orders...</div>
            ) : ordersError ? (
              <div className="text-center py-8">
                <p role="alert" className="text-red-700">{ordersError}</p>
                <button type="button" onClick={fetchOrders} className="mt-3 rounded-lg border border-line px-4 py-2 text-sm text-moon/80 hover:bg-surface">
                  Try again
                </button>
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <OrderRow key={order._id} order={order} onViewDetails={openOrderDetails} />
                ))}
              </div>
            ) : (
              <p className="text-center text-mist py-8">You haven't placed any orders yet.</p>
            )}
          </section>

          {/* Account Settings */}
          <section className="surface-light rounded-lg border border-line bg-panel p-6 text-moon shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-moon">Account Settings</h2>
            <button type="button" onClick={openEditor} className="rounded-lg bg-sakura px-6 py-2 text-white transition-colors hover:bg-[#2563EB]">Edit Profile</button>
          </section>

          {/* Change Password */}
          <section className="surface-light rounded-lg border border-line bg-panel p-6 text-moon shadow-sm">
            <h2 className="mb-6 text-xl font-bold text-moon">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block font-semibold text-moon/80">Current Password</label>
                  <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className={inputClass} required />
                </div>
                <div>
                  <label className="mb-2 block font-semibold text-moon/80">New Password</label>
                  <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className={inputClass} required minLength={8} />
                </div>
                <div>
                  <label className="mb-2 block font-semibold text-moon/80">Confirm New Password</label>
                  <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className={inputClass} required />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="px-6 py-2 rounded-lg bg-sakura text-white transition-colors hover:bg-[#2563EB]">Update Password</button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {activeOrder && (
        <OrderDetailsModal
          order={activeOrder}
          onClose={() => setActiveOrder(null)}
          onCancelOrder={handleCancelOrder}
          cancelling={cancelling}
          cancelError={cancelError}
        />
      )}
    </>
  );
}

export default Profile
