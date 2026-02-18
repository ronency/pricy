document.addEventListener('DOMContentLoaded', init);

const loginSection = document.getElementById('login-section');
const mainSection = document.getElementById('main-section');
const loadingSection = document.getElementById('loading');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const productSelect = document.getElementById('product-select');
const competitorName = document.getElementById('competitor-name');
const competitorPrice = document.getElementById('competitor-price');
const competitorUrl = document.getElementById('competitor-url');
const addCompetitorBtn = document.getElementById('add-competitor-btn');
const statusMessage = document.getElementById('status-message');
const rulePresetsSection = document.getElementById('rule-presets');
const ruleStatus = document.getElementById('rule-status');

let currentApiKey = null;
let lastAddedCompetitor = null;

async function init() {
  showLoading();

  const response = await chrome.runtime.sendMessage({ action: 'getApiKey' });
  currentApiKey = response.apiKey;

  if (currentApiKey) {
    await loadMainView();
  } else {
    showLoginSection();
  }
}

function showLoading() {
  loginSection.classList.add('hidden');
  mainSection.classList.add('hidden');
  loadingSection.classList.remove('hidden');
}

function showLoginSection() {
  loadingSection.classList.add('hidden');
  mainSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
}

function showMainSection() {
  loadingSection.classList.add('hidden');
  loginSection.classList.add('hidden');
  mainSection.classList.remove('hidden');
}

async function loadMainView() {
  showLoading();

  try {
    // Load products
    const productsResponse = await chrome.runtime.sendMessage({
      action: 'getProducts',
      apiKey: currentApiKey
    });

    if (!productsResponse.success) {
      throw new Error(productsResponse.error);
    }

    // Populate product select
    productSelect.innerHTML = '<option value="">Select a product...</option>';
    for (const product of productsResponse.products) {
      const option = document.createElement('option');
      option.value = product.id;
      option.textContent = product.title;
      productSelect.appendChild(option);
    }

    // Extract data from current page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    let pageData = { url: tab.url, title: null, price: null };
    try {
      if (tab.url && tab.url.startsWith('http')) {
        pageData = await chrome.tabs.sendMessage(tab.id, { action: 'extractProductData' });
      }
    } catch {
      // Content script not available (chrome://, about:, etc.)
    }

    competitorName.value = pageData.title || '';
    competitorPrice.value = pageData.price ? `$${pageData.price.toFixed(2)}` : '';
    competitorUrl.value = pageData.url || tab.url || '';

    showMainSection();
  } catch (error) {
    showStatus('Failed to load: ' + error.message, 'error');
    showLoginSection();
  }
}

saveKeyBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey || !apiKey.startsWith('pk_')) {
    showStatus('Please enter a valid API key', 'error');
    return;
  }

  saveKeyBtn.disabled = true;

  try {
    // Test the API key
    const response = await chrome.runtime.sendMessage({
      action: 'getProducts',
      apiKey
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    // Save the key
    await chrome.runtime.sendMessage({
      action: 'setApiKey',
      apiKey
    });

    currentApiKey = apiKey;
    await loadMainView();
  } catch (error) {
    showStatus('Invalid API key: ' + error.message, 'error');
  } finally {
    saveKeyBtn.disabled = false;
  }
});

disconnectBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'setApiKey', apiKey: null });
  currentApiKey = null;
  apiKeyInput.value = '';
  rulePresetsSection.classList.add('hidden');
  lastAddedCompetitor = null;
  showLoginSection();
});

addCompetitorBtn.addEventListener('click', async () => {
  const productId = productSelect.value;
  const name = competitorName.value.trim();
  const url = competitorUrl.value;

  if (!productId) {
    showStatus('Please select a product', 'error');
    return;
  }

  if (!name) {
    showStatus('Please enter a competitor name', 'error');
    return;
  }

  addCompetitorBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'addCompetitor',
      apiKey: currentApiKey,
      data: {
        productId,
        name,
        url
      }
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    showStatus('Competitor added successfully!', 'success');

    // Store for rule presets
    lastAddedCompetitor = response.competitor;

    // Show rule presets section
    rulePresetsSection.classList.remove('hidden');

    // Reset product select
    productSelect.value = '';
  } catch (error) {
    showStatus('Failed: ' + error.message, 'error');
  } finally {
    addCompetitorBtn.disabled = false;
  }
});

// Rule preset buttons
document.querySelectorAll('.btn-preset').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (!lastAddedCompetitor) return;

    const preset = btn.dataset.preset;
    const productId = lastAddedCompetitor.productId;
    const competitorId = lastAddedCompetitor.id;

    const ruleMap = {
      match: { type: 'match_price', name: 'Match competitor price', competitorId, productId },
      below5: { type: 'stay_below', name: 'Stay 5% below competitor', percentage: 5, competitorId, productId },
      below10: { type: 'stay_below', name: 'Stay 10% below competitor', percentage: 10, competitorId, productId },
      alert: { type: 'price_change', name: 'Alert on any price change', competitorId, productId }
    };

    const ruleData = ruleMap[preset];
    if (!ruleData) return;

    btn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'createRule',
        apiKey: currentApiKey,
        data: ruleData
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      showRuleStatus('Rule created!', 'success');
      btn.textContent = 'Created';
    } catch (error) {
      showRuleStatus('Failed: ' + error.message, 'error');
      btn.disabled = false;
    }
  });
});

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  statusMessage.classList.remove('hidden');

  setTimeout(() => {
    statusMessage.classList.add('hidden');
  }, 3000);
}

function showRuleStatus(message, type) {
  ruleStatus.textContent = message;
  ruleStatus.className = `status ${type}`;
  ruleStatus.classList.remove('hidden');

  setTimeout(() => {
    ruleStatus.classList.add('hidden');
  }, 3000);
}
