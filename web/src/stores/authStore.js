import { defineStore } from 'pinia';
import api from '@/services/api';
import { User } from '@pricy/shared';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('userToken') || null,
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
        this.token = response.data.token;
        this.user = new User(response.data.user);
        localStorage.setItem('userToken', this.token);
        return this.user;
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Login failed';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async signup(userData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.signup(userData);
        this.token = response.data.token;
        this.user = new User(response.data.user);
        localStorage.setItem('userToken', this.token);
        return this.user;
      } catch (error) {
        this.error = error.response?.data?.error?.message || 'Signup failed';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchProfile() {
      if (!this.token) return null;
      try {
        const response = await api.getProfile();
        this.user = new User(response.data.user);
        return this.user;
      } catch (error) {
        this.logout();
        throw error;
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('userToken');
    }
  }
});
