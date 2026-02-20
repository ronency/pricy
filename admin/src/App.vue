<template>
  <v-app>
    <v-app-bar v-if="authStore.isLoggedIn" class="app-bar" density="comfortable">
      <v-app-bar-title>
        <router-link to="/" class="app-logo">
          <img src="/logo.svg" alt="Pricera.io" class="app-logo-icon" />
          <span class="app-logo-text">Pricera<span class="app-logo-dot">.io</span></span>
          <span class="app-logo-badge">ADMIN</span>
        </router-link>
      </v-app-bar-title>

      <v-btn variant="text" to="/" exact>Dashboard</v-btn>
      <v-btn variant="text" to="/users">Users</v-btn>
      <v-btn variant="text" to="/products">Products</v-btn>
      <v-btn variant="text" to="/competitors">Competitors</v-btn>
      <v-btn variant="text" to="/plans">Plans</v-btn>
      <v-spacer />
      <span class="admin-user">{{ authStore.currentUser?.name }}</span>
      <v-btn variant="text" @click="logout">Logout</v-btn>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();

onMounted(async () => {
  if (authStore.isLoggedIn && !authStore.currentUser) {
    await authStore.fetchProfile();
  }
});

function logout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style>
body,
.v-application {
  font-family: 'Inter', sans-serif !important;
}

.v-card {
  border: 1px solid #2a2a2a !important;
}

.v-data-table {
  border: 1px solid #2a2a2a !important;
}

a {
  color: #00FF41;
}

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

.app-logo-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: #000;
  background: #F2A900;
  padding: 2px 6px;
  border-radius: 3px;
}

.admin-user {
  font-size: 0.85rem;
  color: #888;
  margin-right: 4px;
}
</style>
