import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faMinus, faPlus, faArrowLeft, faCreditCard, faShoppingCart, faXmark, faUser, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useCart } from '../../context/useCart'
import { useAuth } from '../../context/useAuth'
import { api } from '../../api/client'
import BookCover from '../components/BookCover'
import { LineSkeleton } from '../components/Skeletons'
import { formatPrice } from '../../utils/format'

function CartPage() {
  const { cart, loading, ready, error: cartError, updateCartItem, removeFromCart, clearCart, refreshCart } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [cancelledNotice, setCancelledNotice] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [showCheckout, setShowCheckout] = useState(false)
  const [shippingForm, setShippingForm] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
  })
  const [checkoutError, setCheckoutError] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    }
  }, [isAuthenticated, refreshCart]);

  // Stripe redirects to /cart?cancelled=1 when the customer bails out of checkout.
  useEffect(() => {
    if (searchParams.get('cancelled') === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot return notice
      setCancelledNotice(true);
      const next = new URLSearchParams(searchParams);
      next.delete('cancelled');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // Close the checkout dialog with Escape.
  useEffect(() => {
    if (!showCheckout) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setShowCheckout(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showCheckout]);

  const handleQuantityChange = async (bookId, newQuantity) => {
    if (newQuantity < 1) return;
    await updateCartItem(bookId, newQuantity);
  };

  const handleRemove = async (bookId) => {
    await removeFromCart(bookId);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setCheckoutError('');

    const trimmed = Object.fromEntries(
      Object.entries(shippingForm).map(([key, value]) => [key, String(value).trim()])
    );

    const fieldLabels = {
      name: 'Full name',
      phone: 'Phone',
      street: 'Street address',
      city: 'City',
      state: 'State',
      zipCode: 'ZIP code',
      country: 'Country',
    };
    for (const field of ['name', 'phone', 'street', 'city', 'state', 'zipCode', 'country']) {
      if (!trimmed[field]) {
        setCheckoutError(`${fieldLabels[field]} is required`);
        return;
      }
    }
    if (!/^[+()\-.\s\d]{7,20}$/.test(trimmed.phone)) {
      setCheckoutError('Please enter a valid phone number (digits, spaces, +, -, parentheses; 7-20 characters).');
      return;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9\- ]{2,9}$/.test(trimmed.zipCode)) {
      setCheckoutError('Please enter a valid ZIP / postal code.');
      return;
    }

    setCheckoutLoading(true);
    const shippingAddress = trimmed;
    try {
      if (paymentMethod === 'cod') {
        const response = await api.createOrder({
          shippingAddress,
          paymentMethod: 'cod',
        });
        if (response.success) {
          setShowCheckout(false);
          refreshCart();
          navigate(`/profile?tab=history`);
        } else {
          setCheckoutError(response.message || 'Failed to create order');
        }
        return;
      }

      // Stripe flow: backend creates a Checkout Session; redirect to Stripe.
      if (paymentMethod === 'stripe') {
        const s = await api.createStripeCheckout(shippingAddress);
        if (s.success) {
          // Redirect the customer to Stripe Checkout. They are sent back to the
          // bookstore via the success/cancel URLs after completing the payment.
          window.location.href = s.data.checkoutUrl;
          return;
        }
        setCheckoutError(s.message || 'Could not start Stripe checkout');
        setCheckoutLoading(false);
        return;
      }

      // Razorpay flow
      const rp = await api.createRazorpayOrder();
      if (!rp.success) {
        setCheckoutError(rp.message || 'Could not start payment');
        setCheckoutLoading(false);
        return;
      }
      const loadScript = () => new Promise((resolve, reject) => {
        if (window.Razorpay) return resolve();
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
      await loadScript();

      const options = {
        key: rp.data.keyId,
        amount: rp.data.amount,
        currency: rp.data.currency,
        order_id: rp.data.razorpayOrderId,
        name: 'Book Store',
        description: 'Order payment',
        method: {
          card: true,
          netbanking: true,
          upi: true,
          wallet: true,
          emi: true,
          paylater: true,
        },
        handler: async (response) => {
          try {
            const v = await api.verifyRazorpayPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              shippingAddress,
            });
            if (v.success) {
              setShowCheckout(false);
              refreshCart();
              navigate(`/profile?tab=history`);
            } else {
              setCheckoutError(v.message || 'Payment verification failed');
            }
          } catch (err) {
            setCheckoutError(err.message || 'Payment verification failed');
          } finally {
            setCheckoutLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setCheckoutError('Payment cancelled');
            setCheckoutLoading(false);
          },
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        setCheckoutError(resp.error?.description || 'Payment failed');
        setCheckoutLoading(false);
      });
      rzp.open();
    } catch (error) {
      setCheckoutError(error.message || 'Network error');
      setCheckoutLoading(false);
    } finally {
      if (paymentMethod === 'cod') setCheckoutLoading(false);
    }
  };

  const subtotal = cart.subtotal || 0;
  const shippingFee = subtotal > 500 ? 0 : 50;
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + shippingFee + tax;

  if (!isAuthenticated) {
    return (
      <div className="bg-ink text-moon min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <FontAwesomeIcon icon={faShoppingCart} className="text-6xl text-electric mb-4" />
          <h1 className="font-serif text-3xl font-extrabold mb-2">Please log in to view your cart</h1>
          <p className="text-moon/60 mb-6">You need to be logged in to manage your shopping cart.</p>
          <Link to="/login" className="inline-block rounded-full bg-sakura px-8 py-3 font-semibold text-white hover:bg-[#2563EB]">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ink text-moon min-h-screen">
      <section className="shell py-[clamp(3rem,7vw,6rem)]">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-headline">Your cart</h1>
          <Link to="/all-books" className="text-electric hover:underline flex items-center gap-1">
            <FontAwesomeIcon icon={faArrowLeft} size={14} />
            Continue Shopping
          </Link>
        </div>

        {cancelledNotice && (
          <div role="status" className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            Your payment was cancelled — nothing was charged and your cart is unchanged. You can try again whenever you're ready.
          </div>
        )}

        {!ready ? (
          <div role="status" aria-label="Loading cart" className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-4 border border-line bg-panel p-4">
                  <div className="skeleton h-36 w-24 shrink-0" />
                  <div className="flex-1 space-y-3 pt-1"><LineSkeleton className="w-2/3" /><LineSkeleton className="w-1/3" /><LineSkeleton className="w-1/4" /></div>
                </div>
              ))}
            </div>
            <div className="skeleton h-64" />
          </div>
        ) : cartError ? (
          <div className="text-center py-20">
            <FontAwesomeIcon icon={faShoppingCart} className="text-6xl text-moon/50 mb-4" />
            <h2 className="font-serif text-2xl font-bold mb-2">We couldn't load your cart</h2>
            <p role="alert" className="text-red-600 mb-6">{cartError}</p>
            <button
              type="button"
              onClick={refreshCart}
              className="inline-block rounded-full bg-sakura px-8 py-3 font-semibold text-white hover:bg-[#2563EB]"
            >
              Try again
            </button>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="text-center py-20">
            <FontAwesomeIcon icon={faShoppingCart} className="text-6xl text-moon/50 mb-4" />
            <h2 className="font-serif text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-moon/60 mb-6">Looks like you haven't added any books yet.</p>
            <Link to="/all-books" className="inline-block rounded-full bg-sakura px-8 py-3 font-semibold text-white hover:bg-[#2563EB]">
              Browse Books
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              {cart.items.map((item) => (
                <article key={item.book._id || item.book.id} className="flex gap-4 rounded-lg border border-line bg-panel p-4">
                  <div className="flex-shrink-0 w-24 h-36 overflow-hidden rounded-md">
                    <BookCover book={item.book} eager sizes="96px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-moon line-clamp-1">{item.book.title}</h3>
                    <p className="mt-1 text-sm text-moon/60">{item.book.author}</p>
                    <p className="mt-2 font-semibold text-electric">{formatPrice(item.priceAtAdd)}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center gap-2 rounded border border-line">
                        <button
                          onClick={() => handleQuantityChange(item.book._id || item.book.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || loading}
                          className="px-3 py-1 text-moon hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FontAwesomeIcon icon={faMinus} size={12} />
                        </button>
                        <span className="px-3 text-moon">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.book._id || item.book.id, item.quantity + 1)}
                          disabled={loading}
                          className="px-3 py-1 text-moon hover:bg-surface"
                        >
                          <FontAwesomeIcon icon={faPlus} size={12} />
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemove(item.book._id || item.book.id)}
                        disabled={loading}
                        className="ml-auto text-moon/70 transition-colors hover:text-red-600"
                        aria-label="Remove from cart"
                      >
                        <FontAwesomeIcon icon={faTrash} size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-electric">{formatPrice(item.priceAtAdd * item.quantity)}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="lg:sticky lg:top-24">
              <div className="rounded-xl border border-line bg-panel p-6">
                <h2 className="font-serif text-xl font-bold mb-4">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-moon/80">
                    <span>Subtotal ({cart.itemCount} items)</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-moon/80">
                    <span>Shipping</span>
                    <span>{shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
                  </div>
                  <div className="flex justify-between text-moon/80">
                    <span>Tax (10%)</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                  <div className="border-t border-line pt-3">
                    <div className="flex justify-between font-semibold text-lg text-moon">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>
                {subtotal > 0 && subtotal < 500 && (
                  <p className="mt-4 text-xs text-moon/70">Add {formatPrice(500 - subtotal)} more for free shipping!</p>
                )}
                <button
                  onClick={() => setShowCheckout(true)}
                  disabled={checkoutLoading || cart.items.length === 0}
                  className="mt-6 w-full rounded-full bg-sakura py-3 font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkoutLoading ? 'Processing...' : `Proceed to Checkout · ${formatPrice(total)}`}
                </button>
                {clearConfirm ? (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                    <p className="text-sm text-red-700">Remove every item from your cart?</p>
                    <div className="mt-2 flex justify-center gap-2">
                      <button
                        onClick={() => { clearCart(); setClearConfirm(false); }}
                        disabled={loading}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        Clear everything
                      </button>
                      <button
                        onClick={() => setClearConfirm(false)}
                        disabled={loading}
                        className="rounded-lg border border-line px-4 py-2 text-sm text-moon/70 hover:text-moon disabled:opacity-60"
                      >
                        Keep my cart
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setClearConfirm(true)}
                    disabled={loading}
                    className="mt-3 w-full rounded-full border border-line py-2 text-sm text-moon/60 transition-colors hover:border-electric hover:text-electric"
                  >
                    Clear Cart
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-moon/35" onClick={() => setShowCheckout(false)}>
          <div
            className="surface-light w-[calc(100%-32px)] max-w-[480px] rounded-xl border border-line bg-panel p-6 text-moon shadow-xl shadow-black/10 box-border max-h-[calc(100vh-32px)] max-h-[calc(100dvh-32px)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl font-bold text-moon">Checkout</h2>
              <button onClick={() => setShowCheckout(false)} className="text-mist hover:text-moon">
                <FontAwesomeIcon icon={faXmark} size={20} />
              </button>
            </div>

            {checkoutError && (
              <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm">{checkoutError}</div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-moon flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-sakura" />
                Shipping Information
              </h3>
              <form onSubmit={handleCheckout} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-moon/80 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={shippingForm.name}
                      onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })}
                      className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-moon outline-none placeholder:text-mist focus:ring-2 focus:ring-sakura/50 focus:border-sakura"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-moon/80 mb-1">Phone *</label>
                    <input
                      type="tel"
                      value={shippingForm.phone}
                      onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                      className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-moon outline-none placeholder:text-mist focus:ring-2 focus:ring-sakura/50 focus:border-sakura"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-moon/80 mb-1">Street Address *</label>
                  <input
                    type="text"
                    value={shippingForm.street}
                    onChange={(e) => setShippingForm({ ...shippingForm, street: e.target.value })}
                    className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-moon outline-none placeholder:text-mist focus:ring-2 focus:ring-sakura/50 focus:border-sakura"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-moon/80 mb-1">City *</label>
                    <input
                      type="text"
                      value={shippingForm.city}
                      onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                      className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-moon outline-none placeholder:text-mist focus:ring-2 focus:ring-sakura/50 focus:border-sakura"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-moon/80 mb-1">State *</label>
                    <input
                      type="text"
                      value={shippingForm.state}
                      onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                      className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-moon outline-none placeholder:text-mist focus:ring-2 focus:ring-sakura/50 focus:border-sakura"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-moon/80 mb-1">ZIP Code *</label>
                    <input
                      type="text"
                      value={shippingForm.zipCode}
                      onChange={(e) => setShippingForm({ ...shippingForm, zipCode: e.target.value })}
                      className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-moon outline-none placeholder:text-mist focus:ring-2 focus:ring-sakura/50 focus:border-sakura"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-moon/80 mb-1">Country *</label>
                    <input
                      type="text"
                      value={shippingForm.country}
                      onChange={(e) => setShippingForm({ ...shippingForm, country: e.target.value })}
                      className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-moon outline-none placeholder:text-mist focus:ring-2 focus:ring-sakura/50 focus:border-sakura"
                      required
                    />
                  </div>
                </div>

                <hr className="my-4 border-line" />

                <h3 className="font-semibold text-moon flex items-center gap-2">
                  <FontAwesomeIcon icon={faCreditCard} className="text-sakura" />
                  Payment Method
                </h3>
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 cursor-pointer rounded-lg border p-3 ${paymentMethod === 'cod' ? 'border-sakura bg-sakura/5' : 'border-line bg-surface'}`}>
                    <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="text-sakura" />
                    <span className="text-moon/80">Cash on Delivery (COD)</span>
                  </label>
                  <label className={`flex items-center gap-3 cursor-pointer rounded-lg border p-3 ${paymentMethod === 'razorpay' ? 'border-sakura bg-sakura/5' : 'border-line bg-surface'}`}>
                    <input type="radio" name="payment" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} className="text-sakura" />
                    <span className="text-moon/80">Razorpay — Pay Online</span>
                    <span className="ml-auto text-xs text-mist">Pay securely using available online payment methods.</span>
                  </label>
                  <label className={`flex items-center gap-3 cursor-pointer rounded-lg border p-3 ${paymentMethod === 'stripe' ? 'border-sakura bg-sakura/5' : 'border-line bg-surface'}`}>
                    <input type="radio" name="payment" value="stripe" checked={paymentMethod === 'stripe'} onChange={() => setPaymentMethod('stripe')} className="text-sakura" />
                    <span className="text-moon/80">Stripe — Pay Online</span>
                    <span className="ml-auto text-xs text-mist">Pay securely by card via Stripe.</span>
                  </label>
                </div>

                <div className="rounded-lg border border-line p-4 bg-surface">
                  <div className="flex justify-between text-sm">
                    <span className="text-mist">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-mist">Shipping</span>
                    <span>{shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-mist">Tax</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                  <hr className="my-2 border-line" />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="w-full rounded-full bg-sakura py-3 font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50"
                >
                  {checkoutLoading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spinPulse className="mr-2" />
                      Processing...
                    </>
                  ) : (
                    paymentMethod === 'razorpay' || paymentMethod === 'stripe' ? `Pay Online · ${formatPrice(total)}` : `Place Order · ${formatPrice(total)}`
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CartPage