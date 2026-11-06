// Sessions live in an httpOnly cookie the browser attaches automatically
// (credentials: 'include'), so no token is ever readable by JavaScript.
// Mutating requests must echo the double-submit CSRF cookie in a header;
// the token is kept in memory + sessionStorage (survives reloads, never
// written to localStorage).
const CSRF_STORAGE_KEY = 'csrfToken';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    try {
      this.csrfToken = sessionStorage.getItem(CSRF_STORAGE_KEY);
    } catch {
      this.csrfToken = null;
    }
  }

  setCsrfToken(token) {
    this.csrfToken = token || null;
    try {
      if (token) sessionStorage.setItem(CSRF_STORAGE_KEY, token);
      else sessionStorage.removeItem(CSRF_STORAGE_KEY);
    } catch {
      // Private mode etc. – the token still lives in memory for this session.
    }
  }

  clearCsrfToken() {
    this.setCsrfToken(null);
  }

  // Marks that the session is no longer valid. Wired by AuthContext so a
  // rejected cookie can also clear React state, not just this client.
  onUnauthorized = null;

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const method = (options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    const config = {
      // Send the httpOnly auth cookie alongside the Bearer token so the
      // cookie-based session the API sets is actually usable cross-origin.
      credentials: 'include',
      ...options,
      headers,
    };

    // A failed parse must not be reported as a network error.
    const parse = async (response) => {
      try {
        return await response.json();
      } catch {
        return {};
      }
    };

    let response;
    try {
      response = await fetch(url, config);
    } catch {
      // fetch only rejects for network-level failures.
      throw new Error('Network error. Please check your connection.');
    }

    const data = await parse(response);

    if (response.status === 401) {
      // Distinguish a genuinely dead session from a rejected credential. Only
      // the former should sign the user out; the latter must keep the server's
      // message ("Invalid email or password") instead of a generic one.
      const authEndpoints = ['/auth/login', '/auth/register', '/auth/google'];
      const isCredentialRejection = authEndpoints.includes(endpoint);

      if (!isCredentialRejection) {
        this.clearCsrfToken();
        this.onUnauthorized?.();
      }

      throw new Error(data.message || 'Authentication required');
    }

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  // Shared raw (non-JSON) upload helper: sends the session cookie plus the
  // CSRF header, and normalises errors like request().
  async rawUpload(endpoint, body, headers = {}) {
    if (this.csrfToken) headers['X-CSRF-Token'] = this.csrfToken;
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body,
    });
    if (response.status === 401) {
      this.clearCsrfToken();
      this.onUnauthorized?.();
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    return data;
  }

  // Contact form (public)
  async sendContactMessage(data) {
    return this.request('/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Admin: contact inbox
  async getContactMessages(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    const queryString = searchParams.toString();
    return this.request(queryString ? `/admin/contact-messages?${queryString}` : '/admin/contact-messages');
  }

  async getContactMessagesUnreadCount() {
    return this.request('/admin/contact-messages/unread-count');
  }

  async markContactMessageRead(id, isRead = true) {
    return this.request(`/admin/contact-messages/${id}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead }),
    });
  }

  async deleteContactMessage(id) {
    return this.request(`/admin/contact-messages/${id}`, { method: 'DELETE' });
  }

  async cancelOrder(id) {
    return this.request(`/orders/${id}/cancel`, { method: 'PATCH' });
  }

  async getOrderById(id) {
    return this.request(`/orders/${id}`);
  }

  // Auth endpoints
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async googleLogin(credential) {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateProfile(data) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data) {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async uploadAvatar(file) {
    return this.rawUpload('/auth/avatar', file, {
      'Content-Type': file?.type || 'application/octet-stream',
    });
  }

  // Book endpoints
  async getBooks(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return this.request(`/books?${searchParams.toString()}`);
  }

  async getBookById(id) {
    return this.request(`/books/${id}`);
  }

  async getFeaturedBooks(limit = 8) {
    return this.request(`/books/featured?limit=${limit}`);
  }

  async getSeries() {
    return this.request('/books/series');
  }

  async getAuthors(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    const queryString = searchParams.toString();
    return this.request(queryString ? `/books/authors?${queryString}` : '/books/authors');
  }

  async searchBooks(q, options = {}) {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (options.limit) params.append('limit', options.limit);
    const queryString = params.toString();
    return this.request(queryString ? `/books/search?${queryString}` : '/books/search', { signal: options.signal });
  }

  // Blog endpoints
  async getBlogPosts(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return this.request(`/blog?${searchParams.toString()}`);
  }

  async getAllBlogPosts(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return this.request(`/blog/admin/posts?${searchParams.toString()}`);
  }

  async getBlogPost(slug) {
    return this.request(`/blog/${slug}`);
  }

  async getBlogCategories() {
    return this.request('/blog/categories');
  }

  async getFeaturedBlogPost() {
    return this.request('/blog/featured');
  }

  async getRelatedBlogPosts(slug) {
    return this.request(`/blog/${slug}/related`);
  }

  async createBlogPost(data) {
    return this.request('/blog', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBlogPost(id, data) {
    return this.request(`/blog/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBlogPost(id) {
    return this.request(`/blog/${id}`, { method: 'DELETE' });
  }

  // The backend expects raw image bytes with an image/* content type, not
  // multipart/form-data, so send the file itself (as with uploadCover).
  async uploadBlogImage(file) {
    return this.rawUpload('/blog/images/upload', file, {
      'Content-Type': file?.type || 'application/octet-stream',
    });
  }

  // Cover endpoints
  async searchCovers(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    const queryString = searchParams.toString();
    return this.request(queryString ? `/books/covers/search?${queryString}` : '/books/covers/search');
  }

  async uploadCover(file) {
    return this.rawUpload('/books/covers/upload', file, {
      'Content-Type': file?.type || 'application/octet-stream',
    });
  }

  // Cart endpoints
  async getCart() {
    return this.request('/cart');
  }

  async addToCart(bookId, quantity = 1) {
    return this.request('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ bookId, quantity }),
    });
  }

  async updateCartItem(bookId, quantity) {
    return this.request(`/cart/items/${bookId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeFromCart(bookId) {
    return this.request(`/cart/items/${bookId}`, { method: 'DELETE' });
  }

  async clearCart() {
    return this.request('/cart', { method: 'DELETE' });
  }

  // Wishlist endpoints
  async getWishlist() {
    return this.request('/wishlist');
  }

  async addToWishlist(bookId) {
    return this.request(`/wishlist/${bookId}`, { method: 'PUT' });
  }

  async removeFromWishlist(bookId) {
    return this.request(`/wishlist/${bookId}`, { method: 'DELETE' });
  }

  // Order endpoints
  async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async createRazorpayOrder() {
    return this.request('/payments/create-order', { method: 'POST' });
  }

  async verifyRazorpayPayment(data) {
    return this.request('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createStripeCheckout(shippingAddress) {
    return this.request('/payments/create-stripe-checkout', {
      method: 'POST',
      body: JSON.stringify({ shippingAddress }),
    });
  }

  async getMyOrders(params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/orders/my-orders?${searchParams.toString()}`);
  }

  // Admin: dashboard
  async getDashboardStats() {
    return this.request('/admin/dashboard');
  }

  // Admin: books
  async createBook(data) {
    return this.request('/books', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBook(id, data) {
    return this.request(`/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBook(id) {
    return this.request(`/books/${id}`, { method: 'DELETE' });
  }

  // Category endpoints
  async getCategories(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    const queryString = searchParams.toString();
    return this.request(queryString ? `/categories?${queryString}` : '/categories');
  }

  // Admin: categories
  async createCategory(data) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id, data) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id) {
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  }

  // Admin: users
  async getAllUsers(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return this.request(`/admin/users?${searchParams.toString()}`);
  }

  async getUserStats() {
    return this.request('/admin/users/stats');
  }

  async getUserById(id) {
    return this.request(`/admin/users/${id}`);
  }

  async getUserOrdersAdmin(id, params = {}) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/admin/users/${id}/orders?${searchParams.toString()}`);
  }

  async updateUser(id, data) {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id) {
    return this.request(`/admin/users/${id}`, { method: 'DELETE' });
  }

  // Admin: orders
  async getAllOrders(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });
    return this.request(`/admin/orders?${searchParams.toString()}`);
  }

  async getOrderStats() {
    return this.request('/admin/orders/stats');
  }

  async getAdminOrderById(id) {
    return this.request(`/admin/orders/${id}`);
  }

  async updateOrderStatus(id, data) {
    return this.request(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();