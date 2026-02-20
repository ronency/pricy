<template>
  <v-container class="py-8">
    <h1 class="text-h4 mb-6">All Competitors</h1>

    <v-card class="mb-4 pa-4">
      <div class="d-flex ga-3 align-center flex-wrap">
        <v-text-field
          v-model="search"
          label="Search competitors"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 300px"
          @update:model-value="debouncedLoad"
        />
        <v-select
          v-model="filterStatus"
          :items="['', 'success', 'pending', 'error', 'blocked']"
          label="Status"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 160px"
          @update:model-value="loadCompetitors"
        />
      </div>
    </v-card>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="competitors"
        :loading="loading"
        :items-per-page="25"
        density="comfortable"
      >
        <template #item.currentPrice="{ item }">
          <span class="mono">{{ item.currentPrice != null ? `$${item.currentPrice.toFixed(2)}` : '-' }}</span>
        </template>
        <template #item.checkStatus="{ item }">
          <v-chip :color="statusColor(item.checkStatus)" size="small" variant="tonal">
            {{ item.checkStatus }}
          </v-chip>
        </template>
        <template #item.owner="{ item }">
          <span class="text-body-2">{{ item.ownerName }}</span>
          <div class="text-caption text-medium-emphasis">{{ item.ownerEmail }}</div>
        </template>
        <template #item.lastCheckedAt="{ item }">
          <span class="text-caption">{{ item.lastCheckedAt ? fmtDate(item.lastCheckedAt) : 'Never' }}</span>
        </template>
      </v-data-table>
    </v-card>

    <div class="text-caption text-medium-emphasis mt-3">
      Showing {{ competitors.length }} of {{ total }} competitors
    </div>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';

const loading = ref(false);
const competitors = ref([]);
const total = ref(0);
const search = ref('');
const filterStatus = ref('');

let debounceTimer = null;
function debouncedLoad() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadCompetitors, 300);
}

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Domain', key: 'domain' },
  { title: 'Owner', key: 'owner', sortable: false },
  { title: 'Price', key: 'currentPrice' },
  { title: 'Status', key: 'checkStatus' },
  { title: 'Last Checked', key: 'lastCheckedAt' }
];

function statusColor(s) {
  return { success: 'success', pending: 'default', error: 'error', blocked: 'warning' }[s] || 'default';
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString();
}

async function loadCompetitors() {
  loading.value = true;
  try {
    const params = {};
    if (search.value) params.search = search.value;
    if (filterStatus.value) params.status = filterStatus.value;
    const { data } = await api.getCompetitors(params);
    competitors.value = data.competitors;
    total.value = data.pagination.total;
  } catch (e) {
    console.error('Failed to load competitors:', e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadCompetitors);
</script>

<style scoped>
.mono { font-family: 'JetBrains Mono', monospace; }
</style>
