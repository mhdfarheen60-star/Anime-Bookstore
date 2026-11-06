import { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

// Exported so useAuth.js can consume it. This file deliberately contains only the
// provider, keeping component/hook concerns in separate modules.
export default AuthContext;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // When any request fails with a genuinely dead session, drop it and send
  // the user back to the login screen.
  useEffect(() => {
    api.onUnauthorized = () => {
      api.clearCsrfToken();
      setUser(null);
      navigate('/login', { replace: true });
    };
    return () => {
      api.onUnauthorized = null;
    };
  }, [navigate]);

  // Store the CSRF token returned by the auth endpoints.
  const applyCsrf = useCallback((response) => {
    const csrfToken = response?.data?.csrfToken;
    if (csrfToken) api.setCsrfToken(csrfToken);
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const response = await api.getMe();
      if (response.success) {
        applyCsrf(response);
        setUser(response.data.user);
      }
    } catch {
      // No valid session cookie (or it expired): stay signed out.
      api.clearCsrfToken();
      setUser(null);
    }
    setLoading(false);
  }, [applyCsrf]);

  // Restore the session on first mount. This is a one-off data fetch from
  // the API (the httpOnly cookie rides along automatically), not derived state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- session bootstrap
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const response = await api.login({ email, password });
    if (response.success) {
      applyCsrf(response);
      const { user } = response.data;
      setUser(user);
      return { success: true, role: user.role };
    }
    return { success: false, message: response.message };
  };

  const loginWithGoogle = async (credential) => {
    const response = await api.googleLogin(credential);
    if (response.success) {
      applyCsrf(response);
      const { user } = response.data;
      setUser(user);
      return { success: true, role: user.role };
    }
    return { success: false, message: response.message };
  };

  const register = async (userData) => {
    const response = await api.register(userData);
    if (response.success) {
      applyCsrf(response);
      const { user } = response.data;
      setUser(user);
      return { success: true, role: user.role };
    }
    return { success: false, message: response.message, errors: response.errors };
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors
    }
    api.clearCsrfToken();
    setUser(null);
    navigate('/login');
  };

  const updateProfile = async (data) => {
    const response = await api.updateProfile(data);
    if (response.success) {
      setUser(response.data.user);
      return { success: true };
    }
    return { success: false, message: response.message };
  };

  const uploadAvatar = async (file) => {
    const response = await api.uploadAvatar(file);
    if (response.success) {
      setUser(response.data.user);
      return { success: true, user: response.data.user };
    }
    return { success: false, message: response.message };
  };

  const changePassword = async (data) => {
    const response = await api.changePassword(data);
    if (response.success) {
      applyCsrf(response);
      return { success: true };
    }
    return { success: false, message: response.message };
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile,
    uploadAvatar,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
