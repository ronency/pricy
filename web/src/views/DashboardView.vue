<template>
  <v-container class="py-8">
    <h1 class="text-h4 mb-6">Dashboard</h1>

    <v-row>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4">
          <div class="text-overline text-medium-emphasis">Products Tracked</div>
          <div class="text-h4">{{ stats.productsTracked }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4">
          <div class="text-overline text-medium-emphasis">Competitors</div>
          <div class="text-h4">{{ stats.competitors }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4">
          <div class="text-overline text-medium-emphasis">Active Rules</div>
          <div class="text-h4">{{ stats.activeRules }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4">
          <div class="text-overline text-medium-emphasis">Alerts (7 days)</div>
          <div class="text-h4">{{ stats.recentAlerts }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-6">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Recent Events</v-card-title>
          <v-list v-if="events.length">
            <v-list-item
              v-for="event in events"
              :key="event.id"
              :prepend-icon="getEventIcon(event.type)"
            >
              <v-list-item-title>{{ event.title }}</v-list-item-title>
              <v-list-item-subtitle>{{ event.message }}</v-list-item-subtitle>
              <template #append>
                <span class="text-caption text-medium-emphasis mr-2">{{ formatDate(event.createdAt) }}</span>
                <v-chip :color="getSeverityColor(event.severity)" size="small">
                  {{ event.severity }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-center text-medium-emphasis">
            No recent events
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Quick Actions</v-card-title>
          <v-card-text>
            <v-btn block color="primary" class="mb-2" to="/products">
              <v-icon start>mdi-plus</v-icon>
              Add Product
            </v-btn>
            <v-btn block variant="outlined" class="mb-2" to="/competitors">
              <v-icon start>mdi-store</v-icon>
              Add Competitor
            </v-btn>
            <v-btn block variant="outlined" to="/rules">
              <v-icon start>mdi-bell-plus</v-icon>
              Create Rule
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';

const stats = ref({
  productsTracked: 0,
  competitors: 0,
  activeRules: 0,
  recentAlerts: 0
});

const events = ref([]);

function getEventIcon(type) {
  const icons = {
    price_drop: 'mdi-arrow-down',
    price_increase: 'mdi-arrow-up',
    rule_triggered: 'mdi-bell',
    competitor_error: 'mdi-alert'
  };
  return icons[type] || 'mdi-information';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getSeverityColor(severity) {
  const colors = {
    info: 'info',
    warning: 'warning',
    alert: 'error',
    critical: 'error'
  };
  return colors[severity] || 'grey';
}

onMounted(async () => {
  try {
    const [productsRes, competitorsRes, rulesRes, eventsRes] = await Promise.all([
      api.getProducts({ tracked: true }),
      api.getCompetitors(),
      api.getRules({ active: true }),
      api.getEvents({ limit: 10 })
    ]);

    stats.value = {
      productsTracked: productsRes.data.pagination?.total || 0,
      competitors: competitorsRes.data.competitors?.length || 0,
      activeRules: rulesRes.data.rules?.length || 0,
      recentAlerts: eventsRes.data.events?.filter(e =>
        e.severity === 'alert' || e.severity === 'critical'
      ).length || 0
    };

    events.value = eventsRes.data.events || [];
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  }
});
</script>
