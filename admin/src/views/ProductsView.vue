<template>
  <v-container class="py-8">
    <h1 class="text-h4 mb-6">All Products</h1>

    <v-card class="mb-4 pa-4">
      <div class="d-flex ga-3 align-center flex-wrap">
        <v-text-field
          v-model="search"
          label="Search products"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 300px"
          @update:model-value="debouncedLoad"
        />
      </div>
    </v-card>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="products"
        :loading="loading"
        :items-per-page="25"
        density="comfortable"
      >
        <template #item.currentPrice="{ item }">
          <span class="mono">{{ item.currentPrice != null ? `$${item.currentPrice.toFixed(2)}` : '-' }}</span>
        </template>
        <template #item.isTracked="{ item }">
          <v-chip :color="item.isTracked ? 'success' : 'default'" size="small" variant="tonal">
            {{ item.isTracked ? 'Tracked' : 'Untracked' }}
          </v-chip>
        </template>
        <template #item.owner="{ item }">
          <span class="text-body-2">{{ item.ownerName }}</span>
          <div class="text-caption text-medium-emphasis">{{ item.ownerEmail }}</div>
        </template>
        <template #item.createdAt="{ item }">
          <span class="text-caption">{{ fmtDate(item.createdAt) }}</span>
        </template>
      </v-data-table>
    </v-card>

    <div class="text-caption text-medium-emphasis mt-3">
      Showing {{ products.length }} of {{ total }} products
    </div>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';

const loading = ref(false);
const products = ref([]);
const total = ref(0);
const search = ref('');

let debounceTimer = null;
function debouncedLoad() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadProducts, 300);
}

const headers = [
  { title: 'Title', key: 'title' },
  { title: 'Owner', key: 'owner', sortable: false },
  { title: 'Vendor', key: 'vendor' },
  { title: 'Price', key: 'currentPrice' },
  { title: 'Status', key: 'isTracked' },
  { title: 'Created', key: 'createdAt' }
];

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString() : '';
}

async function loadProducts() {
  loading.value = true;
  try {
    const params = {};
    if (search.value) params.search = search.value;
    const { data } = await api.getProducts(params);
    products.value = data.products;
    total.value = data.pagination.total;
  } catch (e) {
    console.error('Failed to load products:', e);
  } finally {
    loading.value = false;
  }
}

onMounted(loadProducts);
</script>

<style scoped>
.mono { font-family: 'JetBrains Mono', monospace; }
</style>
