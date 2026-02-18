<template>
  <v-container class="py-8">
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">Rules</h1>
      <v-spacer />
      <v-btn color="primary" @click="showAddDialog = true">
        <v-icon start>mdi-plus</v-icon>
        Create Rule
      </v-btn>
    </div>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="rules"
        :loading="loading"
      >
        <template #item.isActive="{ item }">
          <v-switch
            :model-value="item.isActive"
            color="success"
            hide-details
            @update:model-value="toggleRule(item)"
          />
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteRule(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="showAddDialog" max-width="600">
      <v-card>
        <v-card-title>Create Rule</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.name"
            label="Rule Name"
            variant="outlined"
            class="mb-4"
          />
          <v-select
            v-model="form.type"
            :items="ruleTypes"
            item-title="label"
            item-value="value"
            label="Rule Type"
            variant="outlined"
            class="mb-4"
          />
          <v-text-field
            v-model.number="form.conditions.thresholdPercent"
            label="Threshold (%)"
            type="number"
            variant="outlined"
            class="mb-4"
          />
          <v-select
            v-model="form.actions"
            :items="actionTypes"
            item-title="label"
            item-value="value"
            label="Actions"
            variant="outlined"
            multiple
            chips
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showAddDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveRule">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '@/services/api';

const loading = ref(false);
const rules = ref([]);
const showAddDialog = ref(false);

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Type', key: 'type' },
  { title: 'Triggered', key: 'triggerCount' },
  { title: 'Active', key: 'isActive' },
  { title: 'Actions', key: 'actions', sortable: false }
];

const ruleTypes = [
  { value: 'price_below', label: 'Competitor price below mine' },
  { value: 'price_above', label: 'Competitor price above mine' },
  { value: 'price_drop_percent', label: 'Price drops by X%' },
  { value: 'price_drop_amount', label: 'Price drops by $X' },
  { value: 'competitor_any_change', label: 'Any price change' }
];

const actionTypes = [
  { value: 'log', label: 'Log event' },
  { value: 'email', label: 'Send email' },
  { value: 'webhook', label: 'Trigger webhook' }
];

const form = reactive({
  name: '',
  type: 'price_drop_percent',
  conditions: {
    thresholdPercent: 5
  },
  actions: ['log']
});

async function loadRules() {
  loading.value = true;
  try {
    const response = await api.getRules();
    rules.value = response.data.rules;
  } catch (error) {
    console.error('Failed to load rules:', error);
  } finally {
    loading.value = false;
  }
}

async function saveRule() {
  try {
    await api.createRule({
      ...form,
      actions: form.actions.map(type => ({ type }))
    });
    showAddDialog.value = false;
    form.name = '';
    form.type = 'price_drop_percent';
    form.conditions.thresholdPercent = 5;
    form.actions = ['log'];
    await loadRules();
  } catch (error) {
    console.error('Failed to create rule:', error);
  }
}

async function toggleRule(rule) {
  try {
    await api.updateRule(rule.id, { isActive: !rule.isActive });
    await loadRules();
  } catch (error) {
    console.error('Failed to toggle rule:', error);
  }
}

async function deleteRule(rule) {
  if (!confirm(`Delete rule "${rule.name}"?`)) return;
  try {
    await api.deleteRule(rule.id);
    await loadRules();
  } catch (error) {
    console.error('Failed to delete rule:', error);
  }
}

onMounted(loadRules);
</script>
