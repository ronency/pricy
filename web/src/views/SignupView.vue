<template>
  <v-container class="py-16">
    <v-row justify="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card class="pa-6">
          <h1 class="text-h5 mb-6 text-center">Create Account</h1>

          <v-form @submit.prevent="handleSignup">
            <v-text-field
              v-model="form.name"
              label="Full Name"
              variant="outlined"
              :error-messages="errors.name"
              class="mb-4"
            />

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
              hint="At least 8 characters"
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
              Sign Up
            </v-btn>
          </v-form>

          <p class="text-center mt-6 text-body-2">
            Already have an account?
            <router-link to="/login">Login</router-link>
          </p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  name: '',
  email: '',
  password: ''
});

const errors = reactive({
  name: '',
  email: '',
  password: ''
});

async function handleSignup() {
  errors.name = '';
  errors.email = '';
  errors.password = '';

  if (!form.name) {
    errors.name = 'Name is required';
    return;
  }
  if (!form.email) {
    errors.email = 'Email is required';
    return;
  }
  if (!form.password || form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
    return;
  }

  try {
    await authStore.signup(form);
    router.push('/dashboard');
  } catch (error) {
    // Error handled by store
  }
}
</script>
