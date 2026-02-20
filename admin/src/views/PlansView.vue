<template>
  <v-container class="py-8">
    <h1 class="text-h4 mb-6">Plans</h1>

    <v-row>
      <v-col v-for="plan in plans" :key="plan.name" cols="12" sm="6" lg="3">
        <v-card class="pa-5 d-flex flex-column" :class="{ 'plan-highlight': plan.name === 'pro' }">
          <div class="d-flex align-center justify-space-between mb-3">
            <v-chip :color="planColor(plan.name)" variant="flat" label size="small" class="text-capitalize font-weight-bold">
              {{ plan.name }}
            </v-chip>
            <span class="text-h5 mono font-weight-bold">{{ plan.totalUsers }}</span>
          </div>
          <div class="text-caption text-medium-emphasis mb-4">{{ plan.activeUsers }} active</div>

          <v-divider class="mb-4" />

          <div class="text-body-2 mb-1">
            <v-icon size="14" class="mr-1">mdi-package-variant-closed</v-icon>
            {{ plan.limits.maxProducts }} products
          </div>
          <div class="text-body-2 mb-1">
            <v-icon size="14" class="mr-1">mdi-store</v-icon>
            {{ plan.limits.maxCompetitorsPerProduct }} competitors / product
          </div>
          <div class="text-body-2 mb-1">
            <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
            {{ plan.limits.checkFrequency }} checks
          </div>
          <div class="text-body-2 mb-1">
            <v-icon size="14" class="mr-1">mdi-webhook</v-icon>
            Webhooks: {{ plan.limits.webhooksEnabled ? 'Yes' : 'No' }}
          </div>
          <div class="text-body-2">
            <v-icon size="14" class="mr-1">mdi-cog</v-icon>
            Advanced rules: {{ plan.limits.advancedRules ? 'Yes' : 'No' }}
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-6">
      <v-card-title>User Distribution</v-card-title>
      <v-card-text>
        <div v-for="plan in plans" :key="plan.name" class="mb-3">
          <div class="d-flex justify-space-between text-body-2 mb-1">
            <span class="text-capitalize">{{ plan.name }}</span>
            <span class="mono">{{ plan.totalUsers }} users</span>
          </div>
          <v-progress-linear
            :model-value="totalUsers ? (plan.totalUsers / totalUsers) * 100 : 0"
            :color="planColor(plan.name)"
            height="8"
            rounded
          />
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/services/api';

const plans = ref([]);

const totalUsers = computed(() => plans.value.reduce((sum, p) => sum + p.totalUsers, 0));

function planColor(name) {
  return { free: 'default', starter: 'info', pro: 'success', advanced: 'warning' }[name] || 'default';
}

onMounted(async () => {
  try {
    const { data } = await api.getPlans();
    plans.value = data.plans;
  } catch (e) {
    console.error('Failed to load plans:', e);
  }
});
</script>

<style scoped>
.mono { font-family: 'JetBrains Mono', monospace; }
.plan-highlight { border-color: #00FF41 !important; }
</style>
