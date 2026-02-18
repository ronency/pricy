const API_BASE_URL = 'http://localhost:7000/api';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getApiKey') {
    chrome.storage.local.get(['apiKey'], (result) => {
      sendResponse({ apiKey: result.apiKey || null });
    });
    return true;
  }

  if (request.action === 'setApiKey') {
    chrome.storage.local.set({ apiKey: request.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getProducts') {
    getProducts(request.apiKey)
      .then(products => sendResponse({ success: true, products }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'addCompetitor') {
    addCompetitor(request.apiKey, request.data)
      .then(competitor => sendResponse({ success: true, competitor }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'createRule') {
    createRule(request.apiKey, request.data)
      .then(rule => sendResponse({ success: true, rule }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function getProducts(apiKey) {
  const response = await fetch(`${API_BASE_URL}/products?tracked=true`, {
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }

  const data = await response.json();
  return data.products;
}

async function addCompetitor(apiKey, competitorData) {
  const response = await fetch(`${API_BASE_URL}/competitors`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(competitorData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to add competitor');
  }

  const data = await response.json();
  return data.competitor;
}

async function createRule(apiKey, ruleData) {
  const response = await fetch(`${API_BASE_URL}/rules`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(ruleData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create rule');
  }

  const data = await response.json();
  return data.rule;
}
