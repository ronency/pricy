<template>
  <v-container class="py-8">
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">Competitors</h1>
      <v-spacer />
      <v-btn color="primary" @click="showAddDialog = true">
        <v-icon start>mdi-plus</v-icon>
        Add Competitor
      </v-btn>
    </div>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="competitors"
        :loading="loading"
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center ga-3 py-2">
            <v-avatar size="40" rounded="lg" color="grey-darken-3">
              <v-img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" cover />
              <v-icon v-else size="20">mdi-store</v-icon>
            </v-avatar>
            <span>{{ item.name }}</span>
          </div>
        </template>
        <template #item.productName="{ item }">
          {{ productMap[item.productId] || '—' }}
        </template>
        <template #item.currentPrice="{ item }">
          {{ item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : '-' }}
        </template>
        <template #item.checkStatus="{ item }">
          <v-chip :color="getStatusColor(item.checkStatus)" size="small">
            {{ item.checkStatus }}
          </v-chip>
        </template>
        <template #item.actions="{ item }">
          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="text"
            :loading="checking === item.id"
            @click="checkPrice(item)"
          />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteCompetitor(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="showAddDialog" max-width="500">
      <v-card>
        <v-card-title>Add Competitor</v-card-title>
        <v-card-text>
          <v-select
            v-model="form.productId"
            :items="products"
            item-title="title"
            item-value="id"
            label="Product"
            variant="outlined"
            class="mb-4"
          />
          <v-text-field
            v-model="form.name"
            label="Competitor Name"
            variant="outlined"
            class="mb-4"
          />
          <v-text-field
            v-model="form.url"
            label="Product URL"
            variant="outlined"
            placeholder="https://..."
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showAddDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveCompetitor">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import api from '@/services/api';

const loading = ref(false);
const checking = ref(null);
const competitors = ref([]);
const products = ref([]);
const showAddDialog = ref(false);

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Product', key: 'productName' },
  { title: 'Domain', key: 'domain' },
  { title: 'Price', key: 'currentPrice' },
  { title: 'Status', key: 'checkStatus' },
  { title: 'Last Checked', key: 'lastCheckedAt' },
  { title: 'Actions', key: 'actions', sortable: false }
];

const productMap = computed(() => {
  const map = {};
  for (const p of products.value) {
    map[p.id] = p.title;
  }
  return map;
});

const form = reactive({
  productId: null,
  name: '',
  url: ''
});

function getStatusColor(status) {
  const colors = {
    success: 'success',
    pending: 'grey',
    error: 'error',
    blocked: 'warning'
  };
  return colors[status] || 'grey';
}

async function loadData() {
  loading.value = true;
  try {
    const [competitorsRes, productsRes] = await Promise.all([
      api.getCompetitors(),
      api.getProducts()
    ]);
    competitors.value = competitorsRes.data.competitors;
    products.value = productsRes.data.products;
  } catch (error) {
    console.error('Failed to load data:', error);
  } finally {
    loading.value = false;
  }
}

async function saveCompetitor() {
  try {
    await api.createCompetitor(form);
    showAddDialog.value = false;
    form.productId = null;
    form.name = '';
    form.url = '';
    await loadData();
  } catch (error) {
    console.error('Failed to create competitor:', error);
  }
}

async function checkPrice(competitor) {
  checking.value = competitor.id;
  try {
    await api.checkCompetitorPrice(competitor.id);
    await loadData();
  } catch (error) {
    console.error('Failed to check price:', error);
  } finally {
    checking.value = null;
  }
}

async function deleteCompetitor(competitor) {
  if (!confirm(`Delete "${competitor.name}"?`)) return;
  try {
    await api.deleteCompetitor(competitor.id);
    await loadData();
  } catch (error) {
    console.error('Failed to delete competitor:', error);
  }
}

onMounted(loadData);
</script>
