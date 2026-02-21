<template>
  <v-container class="py-8">
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">Products</h1>
      <v-spacer />
      <v-btn variant="tonal" class="mr-3" :loading="syncing" @click="syncProducts">
        <v-icon start>mdi-sync</v-icon>
        Sync from Shopify
      </v-btn>
      <v-btn color="primary" @click="openAddDialog">
        <v-icon start>mdi-plus</v-icon>
        Add Product
      </v-btn>
    </div>

    <!-- Tracking capacity -->
    <v-card class="mb-5 tracking-capacity" variant="tonal">
      <v-card-text class="py-3 px-4">
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-body-2">
            <v-icon size="16" class="mr-1">mdi-radar</v-icon>
            Tracking <strong>{{ trackedCount }}</strong> of <strong>{{ maxProducts }}</strong> products
          </span>
          <span class="text-caption text-medium-emphasis">
            {{ authStore.currentUser?.plan || 'Free' }} plan
          </span>
        </div>
        <v-progress-linear
          :model-value="capacityPercent"
          :color="capacityColor"
          height="8"
          rounded
        />
        <p class="text-caption text-medium-emphasis mt-1 mb-0">
          Select the products you want Pricy to keep an eye on for you.
        </p>
      </v-card-text>
    </v-card>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="products"
        :loading="loading"
        :row-props="rowProps"
      >
        <template #item.product="{ item }">
          <div class="d-flex align-center ga-3 py-2">
            <v-avatar size="40" rounded="lg" color="grey-darken-3">
              <v-img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.title" cover />
              <v-icon v-else size="20">mdi-package-variant</v-icon>
            </v-avatar>
            <span>{{ item.title }}</span>
          </div>
        </template>
        <template #item.currentPrice="{ item }">
          {{ item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : '-' }}
        </template>
        <template #item.competitorCount="{ item }">
          {{ competitorCounts[item.id] || 0 }}
        </template>
        <template #item.isTracked="{ item }">
          <v-switch
            :model-value="item.isTracked"
            color="success"
            density="compact"
            hide-details
            @update:model-value="toggleTracked(item, $event)"
          />
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="editProduct(item)" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteProduct(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-snackbar v-model="syncSnackbar" :color="syncSnackbarColor" :timeout="4000">
      {{ syncMessage }}
    </v-snackbar>

    <!-- Upgrade dialog -->
    <v-dialog v-model="showUpgradeDialog" max-width="420">
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon color="warning">mdi-arrow-up-bold-circle</v-icon>
          Tracking limit reached
        </v-card-title>
        <v-card-text>
          Your <strong>{{ authStore.currentUser?.plan || 'Free' }}</strong> plan allows tracking up to
          <strong>{{ maxProducts }}</strong> products. To track more, upgrade to a higher plan.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showUpgradeDialog = false">Close</v-btn>
          <v-btn color="primary" to="/pricing">View Plans</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editingProduct ? 'Edit Product' : 'Add Product' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.title"
            label="Product Title"
            variant="outlined"
            class="mb-4"
          />
          <v-text-field
            v-model.number="form.currentPrice"
            label="Current Price"
            type="number"
            prefix="$"
            variant="outlined"
            class="mb-4"
          />
          <v-text-field
            v-model="form.vendor"
            label="Vendor"
            variant="outlined"
            class="mb-4"
          />
          <v-textarea
            v-model="form.description"
            label="Description"
            variant="outlined"
            rows="3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveProduct">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';

const authStore = useAuthStore();

const loading = ref(false);
const products = ref([]);
const showDialog = ref(false);
const showUpgradeDialog = ref(false);
const editingProduct = ref(null);
const syncing = ref(false);
const syncSnackbar = ref(false);
const syncSnackbarColor = ref('success');
const syncMessage = ref('');

const maxProducts = computed(() => authStore.currentUser?.planLimits?.maxProducts || 5);
const trackedCount = computed(() => products.value.filter(p => p.isTracked).length);
const capacityPercent = computed(() => Math.min((trackedCount.value / maxProducts.value) * 100, 100));
const capacityColor = computed(() => {
  if (capacityPercent.value >= 100) return 'error';
  if (capacityPercent.value >= 80) return 'warning';
  return 'success';
});

const competitors = ref([]);

const competitorCounts = computed(() => {
  const counts = {};
  for (const c of competitors.value) {
    counts[c.productId] = (counts[c.productId] || 0) + 1;
  }
  return counts;
});

const headers = [
  { title: 'Product', key: 'product' },
  { title: 'Vendor', key: 'vendor' },
  { title: 'Price', key: 'currentPrice' },
  { title: 'Competitors', key: 'competitorCount' },
  { title: 'Tracked', key: 'isTracked' },
  { title: 'Actions', key: 'actions', sortable: false }
];

function rowProps({ item }) {
  return item.isTracked ? { class: 'tracked-row' } : {};
}

const form = reactive({
  title: '',
  currentPrice: null,
  vendor: '',
  description: ''
});

function resetForm() {
  form.title = '';
  form.currentPrice = null;
  form.vendor = '';
  form.description = '';
  editingProduct.value = null;
}

function openAddDialog() {
  resetForm();
  showDialog.value = true;
}

function closeDialog() {
  showDialog.value = false;
  resetForm();
}

async function syncProducts() {
  syncing.value = true;
  try {
    const { data } = await api.syncProducts();
    syncMessage.value = `Sync complete: ${data.created} created, ${data.updated} updated (${data.total} total)`;
    syncSnackbarColor.value = 'success';
    syncSnackbar.value = true;
    await loadProducts();
  } catch (err) {
    syncMessage.value = err.response?.data?.error?.message || 'Sync failed. Is Shopify connected?';
    syncSnackbarColor.value = 'error';
    syncSnackbar.value = true;
  } finally {
    syncing.value = false;
  }
}

async function loadProducts() {
  loading.value = true;
  try {
    const [productsRes, competitorsRes] = await Promise.all([
      api.getProducts(),
      api.getCompetitors()
    ]);
    products.value = productsRes.data.products;
    competitors.value = competitorsRes.data.competitors;
  } catch (error) {
    console.error('Failed to load products:', error);
  } finally {
    loading.value = false;
  }
}

async function saveProduct() {
  try {
    if (editingProduct.value) {
      await api.updateProduct(editingProduct.value.id, form);
    } else {
      await api.createProduct(form);
    }
    closeDialog();
    await loadProducts();
  } catch (error) {
    console.error('Failed to save product:', error);
  }
}

async function toggleTracked(product, value) {
  if (value && trackedCount.value >= maxProducts.value) {
    showUpgradeDialog.value = true;
    return;
  }
  try {
    await api.updateProduct(product.id, { isTracked: value });
    product.isTracked = value;
  } catch (error) {
    console.error('Failed to update tracking:', error);
  }
}

function editProduct(product) {
  editingProduct.value = product;
  form.title = product.title || '';
  form.currentPrice = product.currentPrice || null;
  form.vendor = product.vendor || '';
  form.description = product.description || '';
  showDialog.value = true;
}

async function deleteProduct(product) {
  if (!confirm(`Delete "${product.title}"?`)) return;
  try {
    await api.deleteProduct(product.id);
    await loadProducts();
  } catch (error) {
    console.error('Failed to delete product:', error);
  }
}

onMounted(loadProducts);
</script>

<style scoped>
.tracking-capacity {
  border-left: 3px solid rgb(var(--v-theme-primary));
}
:deep(.tracked-row) {
  background: rgba(var(--v-theme-success), 0.04);
}
</style>
