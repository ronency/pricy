import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('userToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default {
  // Auth
  login(credentials) {
    return apiClient.post('/auth/login', credentials);
  },
  signup(userData) {
    return apiClient.post('/auth/signup', userData);
  },
  getProfile() {
    return apiClient.get('/auth/profile');
  },
  updateProfile(data) {
    return apiClient.put('/auth/profile', data);
  },
  generateApiKey() {
    return apiClient.post('/auth/api-key');
  },
  connectShopify(shop) {
    return apiClient.get('/auth/shopify/oauth', { params: { shop } });
  },

  // Products
  getProducts(params) {
    return apiClient.get('/products', { params });
  },
  getProduct(id) {
    return apiClient.get(`/products/${id}`);
  },
  createProduct(data) {
    return apiClient.post('/products', data);
  },
  updateProduct(id, data) {
    return apiClient.put(`/products/${id}`, data);
  },
  deleteProduct(id) {
    return apiClient.delete(`/products/${id}`);
  },
  syncProducts() {
    return apiClient.post('/products/sync');
  },
  scanPrices() {
    return apiClient.post('/products/scan');
  },

  // Competitors
  getCompetitors(params) {
    return apiClient.get('/competitors', { params });
  },
  getCompetitor(id) {
    return apiClient.get(`/competitors/${id}`);
  },
  createCompetitor(data) {
    return apiClient.post('/competitors', data);
  },
  updateCompetitor(id, data) {
    return apiClient.put(`/competitors/${id}`, data);
  },
  deleteCompetitor(id) {
    return apiClient.delete(`/competitors/${id}`);
  },
  checkCompetitorPrice(id) {
    return apiClient.post(`/competitors/${id}/check`);
  },

  // Public tools
  comparePrices(data) {
    return apiClient.post('/prices/compare', data);
  },
  auditPrice(data) {
    return apiClient.post('/prices/audit', data);
  },

  // Prices
  getLatestPrices(params) {
    return apiClient.get('/prices/latest', { params });
  },
  getPriceHistory(params) {
    return apiClient.get('/prices/history', { params });
  },
  getPriceComparison(productId) {
    return apiClient.get(`/prices/comparison/${productId}`);
  },

  // Rules
  getRules(params) {
    return apiClient.get('/rules', { params });
  },
  getRule(id) {
    return apiClient.get(`/rules/${id}`);
  },
  createRule(data) {
    return apiClient.post('/rules', data);
  },
  updateRule(id, data) {
    return apiClient.put(`/rules/${id}`, data);
  },
  deleteRule(id) {
    return apiClient.delete(`/rules/${id}`);
  },

  // Billing
  createCheckoutSession(priceId) {
    return apiClient.post('/billing/checkout', { priceId });
  },
  createPortalSession() {
    return apiClient.post('/billing/portal');
  },

  // Dashboard
  getDashboardInsights() {
    return apiClient.get('/dashboard/insights');
  },

  // Events
  getEvents(params) {
    return apiClient.get('/events', { params });
  },
  getWeeklySummary() {
    return apiClient.get('/events/summary/weekly');
  },

  // Webhooks
  getWebhooks() {
    return apiClient.get('/webhooks');
  },
  createWebhook(data) {
    return apiClient.post('/webhooks', data);
  },
  deleteWebhook(id) {
    return apiClient.delete(`/webhooks/${id}`);
  },
  testWebhook(id) {
    return apiClient.post(`/webhooks/${id}/test`);
  }
};
