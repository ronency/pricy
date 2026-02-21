<template>
  <v-container class="py-8">
    <h1 class="text-h4 mb-6">Users</h1>

    <v-card class="mb-4 pa-4">
      <div class="d-flex ga-3 align-center flex-wrap">
        <v-text-field
          v-model="search"
          label="Search users"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 300px"
          @update:model-value="debouncedLoad"
        />
        <v-select
          v-model="filterPlan"
          :items="['', 'free', 'starter', 'pro', 'advanced']"
          label="Plan"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 160px"
          @update:model-value="loadUsers"
        />
      </div>
    </v-card>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="users"
        :loading="loading"
        :items-per-page="25"
        density="comfortable"
      >
        <template #item.plan="{ item }">
          <v-chip :color="planColor(item.plan)" size="small" variant="flat" label class="text-capitalize">
            {{ item.plan }}
          </v-chip>
        </template>
        <template #item.stripeSubscriptionStatus="{ item }">
          <v-chip
            v-if="item.stripeSubscriptionStatus"
            :color="subStatusColor(item.stripeSubscriptionStatus)"
            size="small"
            variant="tonal"
          >
            {{ item.stripeSubscriptionStatus }}
          </v-chip>
          <span v-else class="text-medium-emphasis text-caption">--</span>
        </template>
        <template #item.isActive="{ item }">
          <v-chip :color="item.isActive ? 'success' : 'error'" size="small" variant="tonal">
            {{ item.isActive ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>
        <template #item.role="{ item }">
          <v-chip :color="item.role === 'admin' ? 'warning' : 'default'" size="small" variant="tonal" class="text-capitalize">
            {{ item.role }}
          </v-chip>
        </template>
        <template #item.createdAt="{ item }">
          <span class="text-caption">{{ fmtDate(item.createdAt) }}</span>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="confirmDelete(item)" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Edit Dialog -->
    <v-dialog v-model="editDialog" max-width="450">
      <v-card v-if="editUser">
        <v-card-title>Edit User</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">{{ editUser.name }} ({{ editUser.email }})</p>
          <v-select
            v-model="editForm.plan"
            :items="['free', 'starter', 'pro', 'advanced']"
            label="Plan"
            variant="outlined"
            class="mb-4"
          />
          <v-switch v-model="editForm.isActive" label="Active" color="success" />
          <v-select
            v-model="editForm.role"
            :items="['user', 'admin']"
            label="Role"
            variant="outlined"
            class="mt-4"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="editDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveUser">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '@/services/api';

const loading = ref(false);
const saving = ref(false);
const users = ref([]);
const search = ref('');
const filterPlan = ref('');
const editDialog = ref(false);
const editUser = ref(null);
const editForm = reactive({ plan: 'free', isActive: true, role: 'user' });

let debounceTimer = null;
function debouncedLoad() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadUsers, 300);
}

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Email', key: 'email' },
  { title: 'Plan', key: 'plan' },
  { title: 'Subscription', key: 'stripeSubscriptionStatus' },
  { title: 'Active', key: 'isActive' },
  { title: 'Role', key: 'role' },
  { title: 'Joined', key: 'createdAt' },
  { title: '', key: 'actions', sortable: false }
];

function planColor(plan) {
  return { free: 'default', starter: 'info', pro: 'success', advanced: 'warning' }[plan] || 'default';
}

function subStatusColor(status) {
  return { active: 'success', past_due: 'warning', canceled: 'error', trialing: 'info' }[status] || 'default';
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString() : '';
}

async function loadUsers() {
  loading.value = true;
  try {
    const params = {};
    if (search.value) params.search = search.value;
    if (filterPlan.value) params.plan = filterPlan.value;
    const { data } = await api.getUsers(params);
    users.value = data.users;
  } catch (e) {
    console.error('Failed to load users:', e);
  } finally {
    loading.value = false;
  }
}

function openEdit(user) {
  editUser.value = user;
  editForm.plan = user.plan;
  editForm.isActive = user.isActive;
  editForm.role = user.role || 'user';
  editDialog.value = true;
}

async function saveUser() {
  saving.value = true;
  try {
    await api.updateUser(editUser.value.id, editForm);
    editDialog.value = false;
    await loadUsers();
  } catch (e) {
    console.error('Failed to update user:', e);
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(user) {
  if (!confirm(`Delete user "${user.name}" (${user.email})? This will also delete all their products and competitors.`)) return;
  try {
    await api.deleteUser(user.id);
    await loadUsers();
  } catch (e) {
    console.error('Failed to delete user:', e);
  }
}

onMounted(loadUsers);
</script>
