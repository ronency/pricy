<template>
  <v-container class="py-8">
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">Dashboard</h1>
      <v-spacer />
      <v-btn
        color="primary"
        :loading="scanning"
        @click="runScan"
      >
        <v-icon start>mdi-radar</v-icon>
        Run Price Scan
      </v-btn>
    </div>

    <!-- Stats row -->
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

    <!-- Price Insights -->
    <div class="d-flex align-center mt-8 mb-4">
      <h2 class="text-h5">Price Insights</h2>
      <v-spacer />
      <v-btn-toggle v-model="sortBy" density="compact" mandatory variant="outlined" divided>
        <v-btn value="gap" size="small">By Gap</v-btn>
        <v-btn value="action" size="small">By Action</v-btn>
      </v-btn-toggle>
    </div>

    <v-progress-linear v-if="loadingInsights" indeterminate color="primary" class="mb-4" />

    <div v-if="!loadingInsights && insights.length === 0" class="text-center text-medium-emphasis py-8">
      No tracked products yet. <router-link to="/products">Add products</router-link> to see price insights.
    </div>

    <!-- Insights table -->
    <v-card v-if="!loadingInsights && sortedInsights.length > 0">
      <v-table density="comfortable">
        <thead>
          <tr>
            <th style="width: 40px;"></th>
            <th>Product</th>
            <th class="text-right">Your Price</th>
            <th class="text-right">Avg Competitor</th>
            <th class="text-right">Lowest</th>
            <th class="text-center">Action</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="product in sortedInsights" :key="product.id">
            <!-- Product row -->
            <tr
              :class="{ 'cursor-pointer': product.competitors.length > 0 }"
              @click="product.competitors.length > 0 && toggleExpand(product.id)"
            >
              <td>
                <v-btn
                  v-if="product.competitors.length > 0"
                  icon
                  variant="text"
                  size="x-small"
                  @click.stop="toggleExpand(product.id)"
                >
                  <v-icon>{{ expanded[product.id] ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
                </v-btn>
              </td>
              <td>
                <div class="d-flex align-center ga-3 py-2">
                  <v-avatar size="40" rounded="lg" color="grey-lighten-3">
                    <v-img v-if="product.imageUrl" :src="product.imageUrl" />
                    <v-icon v-else size="20" color="grey">mdi-package-variant</v-icon>
                  </v-avatar>
                  <div style="min-width: 0;">
                    <div class="text-body-2 font-weight-medium text-truncate" style="max-width: 240px;">{{ product.title }}</div>
                    <div v-if="product.vendor" class="text-caption text-medium-emphasis">{{ product.vendor }}</div>
                  </div>
                </div>
              </td>
              <td class="text-right text-body-2 font-weight-medium">
                <span :class="product.recommendation ? `text-${actionColor(product.recommendation.action)}` : ''">
                  {{ product.currentPrice != null ? formatCurrency(product.currentPrice, product.currency) : '--' }}
                </span>
              </td>
              <td class="text-right text-body-2">
                {{ product.averageCompetitorPrice != null ? formatCurrency(product.averageCompetitorPrice, product.currency) : '--' }}
              </td>
              <td class="text-right text-body-2">
                {{ product.lowestCompetitorPrice != null ? formatCurrency(product.lowestCompetitorPrice, product.currency) : '--' }}
              </td>
              <td class="text-center">
                <template v-if="product.recommendation">
                  <div class="d-inline-flex align-center ga-1">
                    <v-chip
                      :color="actionColor(product.recommendation.action)"
                      :prepend-icon="actionIcon(product.recommendation.action)"
                      size="small"
                      label
                    >
                      {{ actionLabel(product.recommendation.action) }}
                    </v-chip>
                    <v-tooltip :text="product.recommendation.suggestion" max-width="300" location="top" theme="light">
                      <template #activator="{ props }">
                        <v-icon v-bind="props" size="16" color="grey" class="ml-1">mdi-information-outline</v-icon>
                      </template>
                    </v-tooltip>
                  </div>
                </template>
                <template v-else-if="product.competitorCount === 0">
                  <v-btn size="x-small" variant="text" color="primary" to="/competitors">Add competitors</v-btn>
                </template>
                <span v-else class="text-caption text-medium-emphasis">Scan needed</span>
              </td>
            </tr>

            <!-- Expanded competitors sub-table -->
            <tr v-if="product.competitors.length > 0" v-show="expanded[product.id]">
              <td colspan="6" class="pa-0">
                  <div class="competitors-panel">
                    <v-table density="compact" class="competitors-table">
                      <thead>
                        <tr>
                          <th>Competitor</th>
                          <th class="text-right">Price</th>
                          <th class="text-right">Diff</th>
                          <th style="width: 40px;"></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="comp in product.competitors" :key="comp.id">
                          <td>
                            <div class="d-flex align-center ga-2">
                              <v-avatar size="24" rounded color="grey-lighten-3">
                                <v-img v-if="comp.imageUrl" :src="comp.imageUrl" />
                                <v-icon v-else size="14" color="grey">mdi-store</v-icon>
                              </v-avatar>
                              <div>
                                <div class="text-body-2 text-truncate" style="max-width: 200px;">{{ comp.name }}</div>
                                <div class="text-caption text-medium-emphasis">{{ comp.domain }}</div>
                              </div>
                            </div>
                          </td>
                          <td class="text-right text-body-2">
                            {{ formatCurrency(comp.currentPrice, comp.currency) }}
                          </td>
                          <td class="text-right">
                            <span
                              v-if="comp.priceDifferencePercent != null"
                              :class="diffColor(comp.priceDifferencePercent)"
                              class="text-body-2 font-weight-medium"
                            >
                              {{ comp.priceDifferencePercent > 0 ? '+' : '' }}{{ comp.priceDifferencePercent }}%
                            </span>
                            <span v-else class="text-caption text-medium-emphasis">--</span>
                          </td>
                          <td>
                            <v-btn
                              icon
                              variant="text"
                              size="x-small"
                              :href="comp.url"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <v-icon size="16">mdi-open-in-new</v-icon>
                            </v-btn>
                          </td>
                        </tr>
                      </tbody>
                    </v-table>
                    <!-- Summary -->
                    <div v-if="product.competitors.length > 1" class="d-flex ga-4 py-2 text-caption text-medium-emphasis competitors-summary">
                      <span>Lowest: {{ formatCurrency(product.lowestCompetitorPrice, product.currency) }}</span>
                      <span>Avg: {{ formatCurrency(product.averageCompetitorPrice, product.currency) }}</span>
                    </div>
                  </div>
              </td>
            </tr>
          </template>
        </tbody>
      </v-table>
    </v-card>

    <!-- Recent Events + Quick Actions -->
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

    <v-snackbar v-model="scanSnackbar" :color="scanSnackbarColor" :timeout="4000">
      {{ scanMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '@/services/api';

const stats = ref({
  productsTracked: 0,
  competitors: 0,
  activeRules: 0,
  recentAlerts: 0
});

const events = ref([]);
const insights = ref([]);
const expanded = ref({});
const sortBy = ref('gap');
const loadingInsights = ref(true);
const scanning = ref(false);
const scanSnackbar = ref(false);
const scanSnackbarColor = ref('success');
const scanMessage = ref('');

const ACTION_ORDER = { decrease: 0, increase: 1, keep: 2 };

const sortedInsights = computed(() => {
  const list = [...insights.value];
  if (sortBy.value === 'action') {
    list.sort((a, b) => {
      const aOrder = a.recommendation ? ACTION_ORDER[a.recommendation.action] ?? 3 : 3;
      const bOrder = b.recommendation ? ACTION_ORDER[b.recommendation.action] ?? 3 : 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aAbs = a.recommendation ? Math.abs(a.recommendation.diffPercent) : -1;
      const bAbs = b.recommendation ? Math.abs(b.recommendation.diffPercent) : -1;
      return bAbs - aAbs;
    });
  } else {
    list.sort((a, b) => {
      const aAbs = a.recommendation ? Math.abs(a.recommendation.diffPercent) : -1;
      const bAbs = b.recommendation ? Math.abs(b.recommendation.diffPercent) : -1;
      return bAbs - aAbs;
    });
  }
  return list;
});

function toggleExpand(productId) {
  expanded.value[productId] = !expanded.value[productId];
}

function formatCurrency(amount, currency = 'USD') {
  if (amount == null) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

function diffColor(percent) {
  if (percent > 5) return 'text-warning';
  if (percent < -5) return 'text-success';
  return 'text-info';
}

function actionColor(action) {
  if (action === 'increase') return 'success';
  if (action === 'decrease') return 'warning';
  return 'info';
}

function actionIcon(action) {
  if (action === 'increase') return 'mdi-arrow-up';
  if (action === 'decrease') return 'mdi-arrow-down';
  return 'mdi-check';
}

function actionLabel(action) {
  if (action === 'increase') return 'Consider Increasing';
  if (action === 'decrease') return 'Consider Decreasing';
  return 'Keep Price';
}

function getEventIcon(type) {
  const icons = {
    price_drop: 'mdi-arrow-down',
    price_increase: 'mdi-arrow-up',
    price_discovered: 'mdi-tag-check',
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

async function loadDashboard() {
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
}

async function loadInsights() {
  loadingInsights.value = true;
  try {
    const { data } = await api.getDashboardInsights();
    insights.value = data.products || [];
  } catch (error) {
    console.error('Failed to load insights:', error);
  } finally {
    loadingInsights.value = false;
  }
}

async function runScan() {
  scanning.value = true;
  try {
    const { data } = await api.scanPrices();
    if (data.queued === 0) {
      scanMessage.value = data.message;
      scanSnackbarColor.value = 'warning';
    } else {
      scanMessage.value = `Queued ${data.queued} price checks — results will appear shortly`;
      scanSnackbarColor.value = 'success';
    }
    scanSnackbar.value = true;
    await Promise.all([loadDashboard(), loadInsights()]);
  } catch (err) {
    scanMessage.value = err.response?.data?.error?.message || 'Scan failed';
    scanSnackbarColor.value = 'error';
    scanSnackbar.value = true;
  } finally {
    scanning.value = false;
  }
}

onMounted(() => {
  loadDashboard();
  loadInsights();
});
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.competitors-panel {
  margin-left: 130px;
  margin-bottom: 8px;
  max-width: 600px;
  border-left: 2px solid rgba(var(--v-theme-primary), 0.3);
  overflow: hidden;
}

.competitors-table {
  background: transparent !important;
}

.competitors-summary {
  padding-left: 16px;
}
</style>
