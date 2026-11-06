import { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from './useAuth';

const CartContext = createContext(null);

// Exported so useCart.js can consume it. This file deliberately contains only the
// provider, keeping component/hook concerns in separate modules.
export default CartContext;

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], subtotal: 0, itemCount: 0 });
  const [loading, setLoading] = useState(false);
  // False until the first cart fetch has finished, so pages can show a skeleton.
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const { isAuthenticated, loading: authLoading } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart({ items: [], subtotal: 0, itemCount: 0 });
      setReady(true);
      setError('');
      return;
    }
    setError('');
    try {
      const response = await api.getCart();
      if (response.success) {
        setCart(response.data.cart);
      } else {
        setError(response.message || 'Could not load your cart');
      }
    } catch (err) {
      setError(err?.message || 'Could not load your cart');
    } finally {
      setReady(true);
    }
  }, [isAuthenticated]);

  // Fetch the cart once the auth state is settled. A real data fetch, so the
  // setState-in-effect warning does not apply here.
  useEffect(() => {
    if (!authLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch
      fetchCart();
    }
  }, [fetchCart, authLoading]);

  const addToCart = async (bookId, quantity = 1) => {
    setLoading(true);
    try {
      const response = await api.addToCart(bookId, quantity);
      if (response.success) {
        setCart(response.data.cart);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (bookId, quantity) => {
    setLoading(true);
    try {
      const response = await api.updateCartItem(bookId, quantity);
      if (response.success) {
        setCart(response.data.cart);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (bookId) => {
    setLoading(true);
    try {
      const response = await api.removeFromCart(bookId);
      if (response.success) {
        setCart(response.data.cart);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    setLoading(true);
    try {
      const response = await api.clearCart();
      if (response.success) {
        setCart({ items: [], subtotal: 0, itemCount: 0 });
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    cart,
    loading,
    ready,
    error,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart: fetchCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

