<template>
  <v-container class="py-8">
    <h1 class="text-h4 mb-6">Settings</h1>

    <v-row>
      <v-col cols="12" md="6">
        <v-card class="mb-6">
          <v-card-title>API Key</v-card-title>
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Use this API key to authenticate requests from external applications.
            </p>
            <v-text-field
              v-if="apiKey"
              :model-value="apiKey"
              readonly
              variant="outlined"
              append-inner-icon="mdi-content-copy"
              @click:append-inner="copyApiKey"
            />
            <v-btn
              color="primary"
              :loading="generating"
              @click="generateKey"
            >
              {{ apiKey ? 'Regenerate' : 'Generate' }} API Key
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title>Notifications</v-card-title>
          <v-card-text>
            <v-switch
              v-model="settings.emailNotifications"
              label="Email notifications"
              color="primary"
            />
            <v-switch
              v-model="settings.weeklyDigest"
              label="Weekly digest email"
              color="primary"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" :loading="saving" @click="saveSettings">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="mb-6">
          <v-card-title>Shopify Connection</v-card-title>
          <v-card-text>
            <template v-if="authStore.currentUser?.shopifyConnected">
              <div class="d-flex align-center ga-3 mb-2">
                <v-chip color="success" size="small" variant="tonal">Connected</v-chip>
                <span class="text-body-2">{{ authStore.currentUser.shopifyDomain }}</span>
              </div>
            </template>
            <template v-else>
              <p class="text-body-2 text-medium-emphasis mb-4">
                Connect your Shopify store to sync products and enable automated pricing.
              </p>
              <v-text-field
                v-model="shopDomain"
                label="Store domain"
                placeholder="your-store.myshopify.com"
                variant="outlined"
                hide-details="auto"
                :error-messages="shopifyError"
                class="mb-4"
              />
              <v-btn
                color="primary"
                :loading="connectingShopify"
                :disabled="!shopDomain"
                @click="connectShopify"
              >
                Connect
              </v-btn>
            </template>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title>Billing & Plan</v-card-title>
          <v-card-text>
            <div class="d-flex align-center ga-3 mb-4">
              <span class="text-h6 text-capitalize">{{ user?.plan || 'Free' }}</span>
              <v-chip
                v-if="subscriptionStatus"
                :color="statusColor"
                size="small"
                variant="tonal"
              >
                {{ statusLabel }}
              </v-chip>
            </div>

            <v-list density="compact" class="mb-4">
              <v-list-item>
                <v-list-item-title>Max Products</v-list-item-title>
                <v-list-item-subtitle>{{ user?.planLimits?.maxProducts || 5 }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Competitors per Product</v-list-item-title>
                <v-list-item-subtitle>{{ user?.planLimits?.maxCompetitorsPerProduct || 1 }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Check Frequency</v-list-item-title>
                <v-list-item-subtitle class="text-capitalize">{{ user?.planLimits?.checkFrequency || 'Daily' }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <div v-if="cancelAtPeriodEnd" class="text-warning text-body-2 mb-3">
              Cancels on {{ formatDate(user?.stripeCurrentPeriodEnd) }}. Access continues until then.
            </div>

            <div v-if="subscriptionStatus === 'past_due'" class="text-error text-body-2 mb-3">
              Payment failed. Please update your payment method to keep your plan.
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn
              v-if="user?.plan !== 'free'"
              color="primary"
              :loading="loadingPortal"
              @click="openPortal"
            >
              Manage Billing
            </v-btn>
            <v-btn v-else color="primary" to="/pricing">
              Upgrade
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
    <v-snackbar v-model="checkoutSuccess" color="success" :timeout="5000">
      Subscription activated! Your plan has been updated.
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const apiKey = ref(null);
const generating = ref(false);
const saving = ref(false);
const shopDomain = ref('');
const connectingShopify = ref(false);
const shopifyError = ref('');
const loadingPortal = ref(false);
const checkoutSuccess = ref(false);

const user = computed(() => authStore.currentUser);
const subscriptionStatus = computed(() => user.value?.stripeSubscriptionStatus);
const cancelAtPeriodEnd = computed(() => user.value?.stripeCancelAtPeriodEnd);

const statusColor = computed(() => {
  switch (subscriptionStatus.value) {
    case 'active': return 'success';
    case 'past_due': return 'warning';
    case 'canceled': return 'error';
    default: return 'grey';
  }
});

const statusLabel = computed(() => {
  switch (subscriptionStatus.value) {
    case 'active': return cancelAtPeriodEnd.value ? 'Canceling' : 'Active';
    case 'past_due': return 'Past Due';
    case 'canceled': return 'Canceled';
    default: return subscriptionStatus.value;
  }
});

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function openPortal() {
  loadingPortal.value = true;
  try {
    const { data } = await api.createPortalSession();
    window.location.href = data.portalUrl;
  } catch (err) {
    console.error('Failed to open billing portal:', err);
    loadingPortal.value = false;
  }
}

const settings = reactive({
  emailNotifications: true,
  weeklyDigest: true
});

async function generateKey() {
  generating.value = true;
  try {
    const response = await api.generateApiKey();
    apiKey.value = response.data.apiKey;
  } catch (error) {
    console.error('Failed to generate API key:', error);
  } finally {
    generating.value = false;
  }
}

function copyApiKey() {
  navigator.clipboard.writeText(apiKey.value);
}

async function connectShopify() {
  connectingShopify.value = true;
  shopifyError.value = '';
  try {
    const { data } = await api.connectShopify(shopDomain.value.trim());
    window.location.href = data.authUrl;
  } catch (err) {
    shopifyError.value =
      err.response?.data?.error?.message || 'Failed to start Shopify connection.';
    connectingShopify.value = false;
  }
}

async function saveSettings() {
  saving.value = true;
  try {
    const response = await api.updateProfile({
      emailNotifications: settings.emailNotifications,
      weeklyDigest: settings.weeklyDigest
    });
    authStore.user = response.data.user;
  } catch (error) {
    console.error('Failed to save settings:', error);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  if (authStore.currentUser) {
    settings.emailNotifications = authStore.currentUser.emailNotifications;
    settings.weeklyDigest = authStore.currentUser.weeklyDigest;
  }

  // Handle checkout=success redirect from Stripe
  if (route.query.checkout === 'success') {
    checkoutSuccess.value = true;
    await authStore.fetchProfile();
    router.replace({ query: {} });
  }
});
</script>
