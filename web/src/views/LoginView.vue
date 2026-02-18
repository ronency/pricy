<template>
  <v-container class="py-16">
    <v-row justify="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="pa-6">
          <h1 class="text-h5 mb-6 text-center">Login to Pricy</h1>

          <v-form @submit.prevent="handleLogin">
            <v-text-field
              v-model="form.email"
              label="Email"
              type="email"
              variant="outlined"
              :error-messages="errors.email"
              class="mb-4"
            />

            <v-text-field
              v-model="form.password"
              label="Password"
              type="password"
              variant="outlined"
              :error-messages="errors.password"
              class="mb-4"
            />

            <v-alert
              v-if="authStore.error"
              type="error"
              variant="tonal"
              class="mb-4"
            >
              {{ authStore.error }}
            </v-alert>

            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              :loading="authStore.loading"
            >
              Login
            </v-btn>
          </v-form>

          <p class="text-center mt-6 text-body-2">
            Don't have an account?
            <router-link to="/signup">Sign up</router-link>
          </p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const form = reactive({
  email: '',
  password: ''
});

const errors = reactive({
  email: '',
  password: ''
});

async function handleLogin() {
  errors.email = '';
  errors.password = '';

  if (!form.email) {
    errors.email = 'Email is required';
    return;
  }
  if (!form.password) {
    errors.password = 'Password is required';
    return;
  }

  try {
    await authStore.login(form);
    const redirect = route.query.redirect || '/dashboard';
    router.push(redirect);
  } catch (error) {
    // Error handled by store
  }
}
</script>
