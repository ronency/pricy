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
          <v-card-title>Plan Details</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item>
                <v-list-item-title>Current Plan</v-list-item-title>
                <v-list-item-subtitle class="text-capitalize">
                  {{ authStore.currentUser?.plan || 'Free' }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Max Products</v-list-item-title>
                <v-list-item-subtitle>
                  {{ authStore.currentUser?.planLimits?.maxProducts || 5 }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Competitors per Product</v-list-item-title>
                <v-list-item-subtitle>
                  {{ authStore.currentUser?.planLimits?.maxCompetitorsPerProduct || 1 }}
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Check Frequency</v-list-item-title>
                <v-list-item-subtitle class="text-capitalize">
                  {{ authStore.currentUser?.planLimits?.checkFrequency || 'Daily' }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';

const authStore = useAuthStore();
const apiKey = ref(null);
const generating = ref(false);
const saving = ref(false);
const shopDomain = ref('');
const connectingShopify = ref(false);
const shopifyError = ref('');

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

onMounted(() => {
  if (authStore.currentUser) {
    settings.emailNotifications = authStore.currentUser.emailNotifications;
    settings.weeklyDigest = authStore.currentUser.weeklyDigest;
  }
});
</script>
