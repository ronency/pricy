<template>
  <v-app>
    <v-app-bar color="primary" density="comfortable">
      <v-app-bar-title>
        <router-link to="/" class="text-white text-decoration-none">
          Pricy
        </router-link>
      </v-app-bar-title>

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
        <v-btn variant="outlined" to="/signup" class="ml-2">Sign Up</v-btn>
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
