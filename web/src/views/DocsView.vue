<template>
  <v-container class="py-8" max-width="900">
    <h1 class="text-h4 mb-1">API Documentation</h1>
    <p class="text-body-1 text-medium-emphasis mb-8">
      Everything you need to integrate Pricera.io into your stack.
    </p>

    <!-- Base URL -->
    <v-card class="mb-6">
      <v-card-title class="text-subtitle-1">Base URL</v-card-title>
      <v-card-text>
        <code class="doc-code">{{ baseUrl }}/api</code>
      </v-card-text>
    </v-card>

    <!-- Authentication -->
    <v-card class="mb-6">
      <v-card-title class="text-subtitle-1">Authentication</v-card-title>
      <v-card-text>
        <p class="mb-3">
          All authenticated endpoints require a Bearer token or API key in the
          <code>Authorization</code> header.
        </p>
        <pre class="doc-pre">Authorization: Bearer &lt;your_token&gt;</pre>
        <p class="mt-3 text-body-2 text-medium-emphasis">
          Generate an API key from
          <router-link to="/settings">Settings</router-link> after signing in.
        </p>
      </v-card-text>
    </v-card>

    <!-- Endpoints -->
    <h2 class="text-h5 mb-4">Endpoints</h2>

    <v-card
      v-for="group in endpointGroups"
      :key="group.name"
      class="mb-4"
    >
      <v-card-title class="d-flex align-center">
        <v-icon :icon="group.icon" size="small" class="mr-2" />
        {{ group.name }}
      </v-card-title>
      <v-table density="comfortable">
        <thead>
          <tr>
            <th style="width: 90px">Method</th>
            <th>Path</th>
            <th>Description</th>
            <th style="width: 70px">Auth</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ep in group.endpoints" :key="ep.path">
            <td>
              <v-chip
                :color="methodColor(ep.method)"
                size="x-small"
                variant="flat"
                label
                class="font-weight-bold"
              >
                {{ ep.method }}
              </v-chip>
            </td>
            <td><code class="doc-path">{{ ep.path }}</code></td>
            <td class="text-body-2">{{ ep.description }}</td>
            <td>
              <v-icon
                :icon="ep.auth ? 'mdi-lock' : 'mdi-lock-open-variant'"
                :color="ep.auth ? 'warning' : 'success'"
                size="small"
              />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Coming Soon -->
    <v-card class="mb-6">
      <v-card-text class="text-center py-8">
        <v-icon icon="mdi-file-document-outline" size="48" color="primary" class="mb-4" />
        <h3 class="text-h6 mb-2">Full interactive docs coming soon</h3>
        <p class="text-body-2 text-medium-emphasis">
          We're preparing a Swagger / OpenAPI spec and Postman collection for
          complete request/response examples, schemas, and try-it-live support.
        </p>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
const baseUrl = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  : window.location.origin;

const endpointGroups = [
  {
    name: 'Auth',
    icon: 'mdi-account-key',
    endpoints: [
      { method: 'POST', path: '/auth/signup', description: 'Create a new account', auth: false },
      { method: 'POST', path: '/auth/login', description: 'Login and receive a JWT token', auth: false },
      { method: 'GET', path: '/auth/profile', description: 'Get current user profile', auth: true },
      { method: 'PUT', path: '/auth/profile', description: 'Update profile & notification settings', auth: true },
      { method: 'POST', path: '/auth/api-key', description: 'Generate or regenerate API key', auth: true }
    ]
  },
  {
    name: 'Products',
    icon: 'mdi-package-variant-closed',
    endpoints: [
      { method: 'GET', path: '/products', description: 'List all products', auth: true },
      { method: 'POST', path: '/products', description: 'Create a product', auth: true },
      { method: 'GET', path: '/products/:id', description: 'Get product by ID', auth: true },
      { method: 'PUT', path: '/products/:id', description: 'Update a product', auth: true },
      { method: 'DELETE', path: '/products/:id', description: 'Delete a product', auth: true },
      { method: 'POST', path: '/products/sync', description: 'Sync products from Shopify', auth: true }
    ]
  },
  {
    name: 'Competitors',
    icon: 'mdi-store',
    endpoints: [
      { method: 'GET', path: '/competitors', description: 'List all competitors', auth: true },
      { method: 'POST', path: '/competitors', description: 'Add a competitor', auth: true },
      { method: 'GET', path: '/competitors/:id', description: 'Get competitor by ID', auth: true },
      { method: 'PUT', path: '/competitors/:id', description: 'Update a competitor', auth: true },
      { method: 'DELETE', path: '/competitors/:id', description: 'Delete a competitor', auth: true },
      { method: 'POST', path: '/competitors/:id/check', description: 'Trigger a price check', auth: true }
    ]
  },
  {
    name: 'Prices',
    icon: 'mdi-currency-usd',
    endpoints: [
      { method: 'POST', path: '/prices/compare', description: 'Compare two product URLs (public)', auth: false },
      { method: 'POST', path: '/prices/audit', description: 'Audit a single product URL (public)', auth: false },
      { method: 'GET', path: '/prices/latest', description: 'Get latest competitor prices', auth: true },
      { method: 'GET', path: '/prices/history', description: 'Get price history', auth: true },
      { method: 'GET', path: '/prices/comparison/:productId', description: 'Get full price comparison for a product', auth: true }
    ]
  },
  {
    name: 'Rules',
    icon: 'mdi-bell-cog',
    endpoints: [
      { method: 'GET', path: '/rules', description: 'List all rules', auth: true },
      { method: 'POST', path: '/rules', description: 'Create a rule', auth: true },
      { method: 'GET', path: '/rules/:id', description: 'Get rule by ID', auth: true },
      { method: 'PUT', path: '/rules/:id', description: 'Update a rule', auth: true },
      { method: 'DELETE', path: '/rules/:id', description: 'Delete a rule', auth: true }
    ]
  },
  {
    name: 'Events',
    icon: 'mdi-timeline-clock',
    endpoints: [
      { method: 'GET', path: '/events', description: 'List events (with filters)', auth: true },
      { method: 'GET', path: '/events/summary/weekly', description: 'Get weekly event summary', auth: true }
    ]
  },
  {
    name: 'Webhooks',
    icon: 'mdi-webhook',
    endpoints: [
      { method: 'GET', path: '/webhooks', description: 'List all webhooks', auth: true },
      { method: 'POST', path: '/webhooks', description: 'Create a webhook', auth: true },
      { method: 'DELETE', path: '/webhooks/:id', description: 'Delete a webhook', auth: true },
      { method: 'POST', path: '/webhooks/:id/test', description: 'Send a test webhook', auth: true }
    ]
  }
];

function methodColor(method) {
  const map = {
    GET: 'success',
    POST: 'info',
    PUT: 'warning',
    DELETE: 'error'
  };
  return map[method] || 'grey';
}
</script>

<style scoped>
.doc-code {
  display: inline-block;
  padding: 6px 14px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  color: #00FF41;
}

.doc-pre {
  padding: 14px 18px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  color: #ccc;
  overflow-x: auto;
}

.doc-path {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  color: #00FF41;
}
</style>
