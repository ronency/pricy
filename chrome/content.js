function extractProductData() {
  const data = {
    url: window.location.href,
    title: null,
    price: null,
    currency: null,
    image: null
  };

  // Priority 1: JSON-LD structured data
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const json = JSON.parse(script.textContent);
      const product = json['@type'] === 'Product' ? json
        : json['@graph']?.find(item => item['@type'] === 'Product') || null;

      if (product) {
        data.title = product.name || null;
        const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
        if (offer) {
          data.price = parseFloat(offer.price) || null;
          data.currency = offer.priceCurrency || null;
        }
        if (product.image) {
          data.image = Array.isArray(product.image) ? product.image[0] : product.image;
        }
        if (data.title && data.price) return data;
      }
    } catch {
      // Invalid JSON-LD, continue
    }
  }

  // Priority 2: OpenGraph meta tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogPrice = document.querySelector('meta[property="product:price:amount"]');
  const ogCurrency = document.querySelector('meta[property="product:price:currency"]');
  const ogImage = document.querySelector('meta[property="og:image"]');

  if (ogTitle) data.title = data.title || ogTitle.getAttribute('content');
  if (ogPrice) data.price = data.price || parseFloat(ogPrice.getAttribute('content'));
  if (ogCurrency) data.currency = data.currency || ogCurrency.getAttribute('content');
  if (ogImage) data.image = data.image || ogImage.getAttribute('content');

  if (data.title && data.price) return data;

  // Priority 3: DOM selectors fallback
  if (!data.title) {
    const titleSelectors = [
      'h1',
      '[data-product-title]',
      '.product-title',
      '.product-name',
      '[itemprop="name"]'
    ];

    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        data.title = el.textContent.trim();
        break;
      }
    }
  }

  if (!data.price) {
    const priceSelectors = [
      '[data-price]',
      '[itemprop="price"]',
      '.price',
      '.product-price',
      '.sale-price',
      '.current-price'
    ];

    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const priceAttr = el.getAttribute('data-price') || el.getAttribute('content');
        if (priceAttr) {
          data.price = parseFloat(priceAttr);
          break;
        }
        const text = el.textContent.trim();
        const match = text.match(/[\d,.]+/);
        if (match) {
          data.price = parseFloat(match[0].replace(/,/g, ''));
          break;
        }
      }
    }
  }

  if (!data.currency) {
    const currencyMeta = document.querySelector('meta[itemprop="priceCurrency"]');
    if (currencyMeta) {
      data.currency = currencyMeta.getAttribute('content');
    }
  }

  if (!data.image) {
    const imageSelectors = [
      '[data-product-image]',
      '.product-image img',
      '[itemprop="image"]',
      '.product-photo img'
    ];

    for (const selector of imageSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        data.image = el.src || el.getAttribute('content');
        if (data.image) break;
      }
    }
  }

  return data;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractProductData') {
    const data = extractProductData();
    sendResponse(data);
  }
  return true;
});
