<template>
  <v-container class="py-8" max-width="900">
    <h1 class="text-h4 mb-1">Price Comparison</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">
      Enter two product URLs to compare prices and get actionable insights.
    </p>

    <v-card class="mb-6">
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="compare">
          <v-text-field
            v-model="yourUrl"
            label="Your Product URL"
            placeholder="https://yourstore.com/products/example"
            :rules="[rules.required, rules.url]"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="competitorUrl"
            label="Competitor URL"
            placeholder="https://competitor.com/products/example"
            :rules="[rules.required, rules.url]"
            variant="outlined"
            class="mb-3"
          />
          <v-btn
            type="submit"
            color="primary"
            size="large"
            :loading="loading"
            block
          >
            Compare Prices
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>

    <v-alert v-if="error" type="error" class="mb-6" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <template v-if="result">
      <v-row class="mb-4">
        <v-col cols="12" sm="6">
          <v-card>
            <v-card-title class="text-subtitle-1">Your Product</v-card-title>
            <v-card-text>
              <div class="text-h4 font-weight-bold mb-2">
                {{ formatCurrency(result.yourProduct.price, result.yourProduct.currency) }}
              </div>
              <div class="text-body-2 text-medium-emphasis">{{ getDomain(result.yourProduct.url) }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6">
          <v-card>
            <v-card-title class="text-subtitle-1">Competitor</v-card-title>
            <v-card-text>
              <div class="text-h4 font-weight-bold mb-2">
                {{ formatCurrency(result.competitor.price, result.competitor.currency) }}
              </div>
              <div class="text-body-2 text-medium-emphasis">{{ getDomain(result.competitor.url) }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card>
        <v-card-title class="text-subtitle-1">Analysis</v-card-title>
        <v-card-text>
          <div class="d-flex align-center ga-4 mb-4">
            <div>
              <span class="text-body-2 text-medium-emphasis">Difference:</span>
              <span class="text-body-1 font-weight-medium ml-1">
                {{ formatDifference(result.analysis.priceDifference) }}
                ({{ result.analysis.priceDifferencePercent > 0 ? '+' : '' }}{{ result.analysis.priceDifferencePercent }}%)
              </span>
            </div>
            <v-chip
              :color="positionColor(result.analysis.position)"
              variant="flat"
              size="small"
            >
              {{ positionLabel(result.analysis.position) }}
            </v-chip>
          </div>
          <v-alert
            :type="positionAlertType(result.analysis.position)"
            variant="tonal"
          >
            {{ result.analysis.suggestion }}
          </v-alert>
        </v-card-text>
      </v-card>
    </template>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import api from '@/services/api';
import { extractDomain, formatPrice } from '@pricy/shared';

const formRef = ref(null);
const yourUrl = ref('');
const competitorUrl = ref('');
const loading = ref(false);
const error = ref('');
const result = ref(null);

const rules = {
  required: v => !!v || 'Required',
  url: v => {
    try {
      const u = new URL(v);
      return (u.protocol === 'http:' || u.protocol === 'https:') || 'Must be a valid URL';
    } catch {
      return 'Must be a valid URL';
    }
  }
};

async function compare() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  loading.value = true;
  error.value = '';
  result.value = null;

  try {
    const { data } = await api.comparePrices({
      yourUrl: yourUrl.value,
      competitorUrl: competitorUrl.value
    });
    result.value = data;
  } catch (err) {
    error.value = err.response?.data?.error?.message || 'Failed to compare prices. Please check the URLs and try again.';
  } finally {
    loading.value = false;
  }
}

function getDomain(url) {
  return extractDomain(url) || url;
}

function formatCurrency(amount, currency) {
  return formatPrice(amount, currency || 'USD');
}

function formatDifference(diff) {
  const prefix = diff > 0 ? '+' : '';
  return `${prefix}$${Math.abs(diff).toFixed(2)}`;
}

function positionColor(position) {
  if (position === 'cheaper') return 'success';
  if (position === 'same') return 'default';
  return 'error';
}

function positionLabel(position) {
  if (position === 'cheaper') return 'Cheaper';
  if (position === 'same') return 'Same Price';
  return 'More Expensive';
}

function positionAlertType(position) {
  if (position === 'cheaper') return 'success';
  if (position === 'same') return 'info';
  return 'warning';
}
</script>
