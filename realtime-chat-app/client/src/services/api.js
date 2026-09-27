// client/src/services/api.js
// Central axios instance: adds the JWT to every request automatically.

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// Attach the token from localStorage to every outgoing request, if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server ever responds 401 (bad/expired token), log the user out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

export const getAllUsers = () => api.get('/users');
export const getUserById = (id) => api.get(`/users/${id}`);

export const getMessages = (userId) => api.get(`/messages/${userId}`);
export const sendMessageHttp = (data) => api.post('/messages', data);
export const deleteMessageHttp = (id) => api.delete(`/messages/${id}`);

export default api;
