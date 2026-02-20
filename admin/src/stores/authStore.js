import { defineStore } from 'pinia';
import api from '@/services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('adminToken') || null,
    loading: false,
    error: null
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    currentUser: (state) => state.user
  },

  actions: {
    async login(credentials) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.login(credentials);
        const user = response.data.user;

        if (!user.role === 'admin') {
          this.error = 'Admin access required';
          throw new Error('Admin access required');
        }

        this.token = response.data.token;
        this.user = user;
        localStorage.setItem('adminToken', this.token);
        return this.user;
      } catch (error) {
        if (!this.error) {
          this.error = error.response?.data?.error?.message || 'Login failed';
        }
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchProfile() {
      if (!this.token) return null;
      try {
        const response = await api.getProfile();
        const user = response.data.user;
        if (!user.role === 'admin') {
          this.logout();
          return null;
        }
        this.user = user;
        return this.user;
      } catch {
        this.logout();
        return null;
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('adminToken');
    }
  }
});
