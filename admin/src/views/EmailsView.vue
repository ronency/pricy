<template>
  <v-container class="py-8">
    <h1 class="text-h4 mb-6">Emails</h1>

    <v-card class="mb-4 pa-4">
      <div class="d-flex ga-3 align-center flex-wrap">
        <v-select
          v-model="filterType"
          :items="emailTypes"
          label="Type"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 200px"
          @update:model-value="loadEmails"
        />
      </div>
    </v-card>

    <v-card>
      <v-data-table-server
        :headers="headers"
        :items="emails"
        :items-length="total"
        :loading="loading"
        :items-per-page="25"
        density="comfortable"
        @update:page="onPageChange"
        @update:items-per-page="onPerPageChange"
      >
        <template #item.type="{ item }">
          <v-chip v-if="item.type" size="small" variant="tonal" label>{{ item.type }}</v-chip>
          <span v-else class="text-medium-emphasis text-caption">--</span>
        </template>
        <template #item.status="{ item }">
          <v-chip
            :color="statusColor(item.status)"
            size="small"
            variant="tonal"
          >
            {{ item.status }}
          </v-chip>
        </template>
        <template #item.createdAt="{ item }">
          <span class="text-caption">{{ fmtDate(item.createdAt) }}</span>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-eye" size="small" variant="text" @click="previewEmail(item)" />
        </template>
      </v-data-table-server>
    </v-card>

    <!-- Email Preview Dialog -->
    <v-dialog v-model="previewDialog" max-width="700">
      <v-card v-if="previewData">
        <v-card-title class="d-flex align-center">
          <span>{{ previewData.subject }}</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="previewDialog = false" />
        </v-card-title>
        <v-card-subtitle>
          To: {{ previewData.to }} | Type: {{ previewData.type || '--' }} | {{ fmtDate(previewData.createdAt) }}
        </v-card-subtitle>
        <v-divider />
        <v-card-text class="pa-0">
          <iframe
            :srcdoc="previewData.html"
            sandbox="allow-same-origin"
            style="width:100%; height:500px; border:none;"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '@/services/api';

const loading = ref(false);
const emails = ref([]);
const total = ref(0);
const filterType = ref('');
const page = ref(1);
const perPage = ref(25);
const previewDialog = ref(false);
const previewData = ref(null);

const emailTypes = ['', 'price-alert', 'weekly-digest', 'webhook-disabled'];

const headers = [
  { title: 'To', key: 'to' },
  { title: 'Subject', key: 'subject' },
  { title: 'Type', key: 'type' },
  { title: 'Status', key: 'status' },
  { title: 'Date', key: 'createdAt' },
  { title: '', key: 'actions', sortable: false }
];

function statusColor(status) {
  return { saved: 'info', sent: 'success', failed: 'error' }[status] || 'default';
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleString() : '';
}

async function loadEmails() {
  loading.value = true;
  try {
    const params = { page: page.value, limit: perPage.value };
    if (filterType.value) params.type = filterType.value;
    const { data } = await api.getEmails(params);
    emails.value = data.emails;
    total.value = data.total;
  } catch (e) {
    console.error('Failed to load emails:', e);
  } finally {
    loading.value = false;
  }
}

function onPageChange(p) {
  page.value = p;
  loadEmails();
}

function onPerPageChange(pp) {
  perPage.value = pp;
  page.value = 1;
  loadEmails();
}

async function previewEmail(item) {
  try {
    const { data } = await api.getEmail(item.id);
    previewData.value = data.email;
    previewDialog.value = true;
  } catch (e) {
    console.error('Failed to load email:', e);
  }
}

onMounted(loadEmails);
</script>
