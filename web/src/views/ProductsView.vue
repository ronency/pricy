<template>
  <v-container class="py-8">
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">Products</h1>
      <v-spacer />
      <v-btn color="primary" @click="openAddDialog">
        <v-icon start>mdi-plus</v-icon>
        Add Product
      </v-btn>
    </div>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="products"
        :loading="loading"
      >
        <template #item.currentPrice="{ item }">
          {{ item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : '-' }}
        </template>
        <template #item.isTracked="{ item }">
          <v-chip :color="item.isTracked ? 'success' : 'grey'" size="small">
            {{ item.isTracked ? 'Tracked' : 'Not tracked' }}
          </v-chip>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="editProduct(item)" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteProduct(item)" />
        </template>
      </v-data-table>
    </v-card>

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
import { ref, reactive, onMounted } from 'vue';
import api from '@/services/api';

const loading = ref(false);
const products = ref([]);
const showDialog = ref(false);
const editingProduct = ref(null);

const headers = [
  { title: 'Title', key: 'title' },
  { title: 'Vendor', key: 'vendor' },
  { title: 'Price', key: 'currentPrice' },
  { title: 'Status', key: 'isTracked' },
  { title: 'Actions', key: 'actions', sortable: false }
];

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

async function loadProducts() {
  loading.value = true;
  try {
    const response = await api.getProducts();
    products.value = response.data.products;
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
