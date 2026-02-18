<template>
  <v-container class="py-16">
    <v-row justify="center">
      <v-col cols="12" md="8" class="text-center">
        <h1 class="text-h2 font-weight-bold mb-4">
          Dynamic Pricing Intelligence
        </h1>
        <p class="text-h6 text-medium-emphasis mb-8">
          Monitor competitor pricing, detect actionable changes, and get automated insights
          to increase your margins and conversions.
        </p>
        <v-btn
          v-if="!authStore.isLoggedIn"
          color="primary"
          size="x-large"
          to="/signup"
        >
          Get Started Free
        </v-btn>
        <v-btn
          v-else
          color="primary"
          size="x-large"
          to="/dashboard"
        >
          Go to Dashboard
        </v-btn>
      </v-col>
    </v-row>

    <v-row class="mt-16">
      <v-col cols="12" md="4">
        <v-card class="pa-6 text-center" variant="outlined">
          <v-icon size="48" color="primary" class="mb-4">mdi-magnify-scan</v-icon>
          <h3 class="text-h6 mb-2">Track Competitors</h3>
          <p class="text-body-2 text-medium-emphasis">
            Monitor competitor prices automatically with daily or hourly checks.
          </p>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="pa-6 text-center" variant="outlined">
          <v-icon size="48" color="primary" class="mb-4">mdi-bell-ring</v-icon>
          <h3 class="text-h6 mb-2">Smart Alerts</h3>
          <p class="text-body-2 text-medium-emphasis">
            Get notified when prices change based on your custom rules.
          </p>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="pa-6 text-center" variant="outlined">
          <v-icon size="48" color="primary" class="mb-4">mdi-chart-timeline-variant</v-icon>
          <h3 class="text-h6 mb-2">Price History</h3>
          <p class="text-body-2 text-medium-emphasis">
            Analyze price trends and make data-driven pricing decisions.
          </p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();
</script>
