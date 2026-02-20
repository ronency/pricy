<template>
  <v-container class="py-8">
    <h1 class="text-h4 mb-6">Dashboard</h1>

    <v-row>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4">
          <div class="text-overline text-medium-emphasis">Total Users</div>
          <div class="text-h4 stat-val">{{ stats.users?.total ?? '-' }}</div>
          <div class="text-caption text-medium-emphasis">{{ stats.users?.active ?? 0 }} active</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4">
          <div class="text-overline text-medium-emphasis">Products</div>
          <div class="text-h4 stat-val">{{ stats.products ?? '-' }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4">
          <div class="text-overline text-medium-emphasis">Competitors</div>
          <div class="text-h4 stat-val">{{ stats.competitors ?? '-' }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4">
          <div class="text-overline text-medium-emphasis">Paid Users</div>
          <div class="text-h4 stat-val">{{ paidUsers }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Users by Plan</v-card-title>
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Plan</th>
                <th class="text-right">Users</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(count, plan) in stats.plans" :key="plan">
                <td>
                  <v-chip :color="planColor(plan)" size="small" variant="flat" label class="text-capitalize">
                    {{ plan }}
                  </v-chip>
                </td>
                <td class="text-right mono">{{ count }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Quick Links</v-card-title>
          <v-card-text>
            <v-btn block color="primary" class="mb-2" to="/users">
              <v-icon start>mdi-account-group</v-icon> Manage Users
            </v-btn>
            <v-btn block variant="outlined" class="mb-2" to="/products">
              <v-icon start>mdi-package-variant-closed</v-icon> All Products
            </v-btn>
            <v-btn block variant="outlined" class="mb-2" to="/competitors">
              <v-icon start>mdi-store</v-icon> All Competitors
            </v-btn>
            <v-btn block variant="outlined" to="/plans">
              <v-icon start>mdi-credit-card</v-icon> Plan Overview
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/services/api';

const stats = ref({ users: null, products: null, competitors: null, plans: {} });

const paidUsers = computed(() => {
  const p = stats.value.plans || {};
  return (p.starter || 0) + (p.pro || 0) + (p.advanced || 0);
});

function planColor(plan) {
  const map = { free: 'default', starter: 'info', pro: 'success', advanced: 'warning' };
  return map[plan] || 'default';
}

onMounted(async () => {
  try {
    const { data } = await api.getStats();
    stats.value = data;
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
});
</script>

<style scoped>
.stat-val { font-family: 'JetBrains Mono', monospace; }
.mono { font-family: 'JetBrains Mono', monospace; }
</style>
