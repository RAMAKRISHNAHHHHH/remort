// client/src/context/AuthContext.jsx
// Holds the logged-in user + token, and exposes login/register/logout helpers.

import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reconnect the socket automatically if the app reloads while logged in
  useEffect(() => {
    if (token) {
      connectSocket(token);
    }
  }, [token]);

  const persistSession = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    connectSocket(newToken);
  };

  const login = async (email, password) => {
    setAuthError('');
    setLoading(true);
    try {
      const { data } = await loginUser({ email, password });
      persistSession(data.token, data.user);
      return true;
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Login failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setAuthError('');
    setLoading(true);
    try {
      const { data } = await registerUser({ name, email, password });
      persistSession(data.token, data.user);
      return true;
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Registration failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    disconnectSocket();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, authError, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
