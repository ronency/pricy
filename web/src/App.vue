<template>
  <v-app>
    <v-app-bar class="app-bar" density="comfortable">
      <v-app-bar-title>
        <router-link to="/" class="app-logo">
          <img src="/logo.svg" alt="Pricera.io" class="app-logo-icon" />
          <span class="app-logo-text">Pricera<span class="app-logo-dot">.io</span></span>
        </router-link>
      </v-app-bar-title>

      <v-btn variant="text" to="/compare">Compare</v-btn>
      <v-btn variant="text" to="/docs">Docs</v-btn>
      <v-btn variant="text" to="/pricing">Pricing</v-btn>

      <template v-if="authStore.isLoggedIn">
        <v-btn variant="text" to="/dashboard">Dashboard</v-btn>
        <v-btn variant="text" to="/products">Products</v-btn>
        <v-btn variant="text" to="/competitors">Competitors</v-btn>
        <v-btn variant="text" to="/rules">Rules</v-btn>
        <v-spacer />
        <v-btn icon="mdi-cog" variant="text" to="/settings" />
        <v-btn variant="text" @click="logout">Logout</v-btn>
      </template>
      <template v-else>
        <v-spacer />
        <v-btn variant="text" to="/login">Login</v-btn>
        <v-btn variant="outlined" to="/signup" color="primary" class="ml-2">Sign Up</v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
});

onMounted(async () => {
  if (authStore.isLoggedIn && !authStore.currentUser) {
    try {
      await authStore.fetchProfile();
    } catch {
      // fetchProfile already calls logout on failure
    }
  }
});

async function logout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style>
/* ─── Global Typography ─── */
body,
.v-application {
  font-family: 'Inter', sans-serif !important;
}

/* ─── Global Tweaks for Dark Theme ─── */
.v-card {
  border: 1px solid #2a2a2a !important;
}

.v-data-table {
  border: 1px solid #2a2a2a !important;
}

a {
  color: #00FF41;
}

/* ─── App Bar ─── */
.app-bar {
  background: rgba(13, 13, 13, 0.92) !important;
  backdrop-filter: blur(14px);
  border-bottom: 1px solid #2a2a2a !important;
}

.app-bar > .v-toolbar__content {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.app-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none !important;
}

.app-logo-icon {
  width: 28px;
  height: 28px;
}

.app-logo-text {
  font-family: 'JetBrains Mono', monospace !important;
  font-weight: 700;
  font-size: 1.15rem;
  color: #FFFFFF !important;
  letter-spacing: 1px;
}

.app-logo-dot {
  color: #00FF41;
}
</style>
