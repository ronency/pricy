export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

export function calculatePriceChange(currentPrice, previousPrice) {
  if (!previousPrice || previousPrice === 0) return null;
  const change = currentPrice - previousPrice;
  const changePercent = (change / previousPrice) * 100;
  return {
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100
  };
}

export function formatPrice(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

export function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'pk_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateWebhookSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'whsec_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function sanitizePrice(priceString) {
  if (typeof priceString === 'number') return priceString;
  if (!priceString) return null;

  const cleaned = priceString
    .replace(/[^0-9.,]/g, '')
    .replace(/,/g, '.');

  const parts = cleaned.split('.');
  if (parts.length > 2) {
    const lastPart = parts.pop();
    return parseFloat(parts.join('') + '.' + lastPart);
  }

  return parseFloat(cleaned) || null;
}
