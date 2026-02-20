import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default {
  // Auth (uses same auth endpoints)
  login(credentials) {
    return apiClient.post('/auth/login', credentials);
  },
  getProfile() {
    return apiClient.get('/auth/profile');
  },

  // Admin
  getStats() {
    return apiClient.get('/admin/stats');
  },
  getUsers(params) {
    return apiClient.get('/admin/users', { params });
  },
  getUser(id) {
    return apiClient.get(`/admin/users/${id}`);
  },
  updateUser(id, data) {
    return apiClient.put(`/admin/users/${id}`, data);
  },
  deleteUser(id) {
    return apiClient.delete(`/admin/users/${id}`);
  },
  getProducts(params) {
    return apiClient.get('/admin/products', { params });
  },
  getCompetitors(params) {
    return apiClient.get('/admin/competitors', { params });
  },
  getPlans() {
    return apiClient.get('/admin/plans');
  }
};
