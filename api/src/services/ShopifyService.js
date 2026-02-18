export class ShopifyService {
  constructor(shopDomain, accessToken) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
    this.apiVersion = '2024-01';
  }

  async request(endpoint, options = {}) {
    const url = `https://${this.shopDomain}/admin/api/${this.apiVersion}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.errors || `Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    const linkHeader = response.headers.get('Link');

    return { data, linkHeader };
  }

  parsePageInfo(linkHeader) {
    if (!linkHeader) return null;

    const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&]*)[^>]*>;\s*rel="next"/);
    return nextMatch ? nextMatch[1] : null;
  }

  async getProducts(limit = 250) {
    const allProducts = [];
    let pageInfo = null;

    do {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (pageInfo) {
        params.set('page_info', pageInfo);
      }

      const { data, linkHeader } = await this.request(`/products.json?${params}`);
      allProducts.push(...data.products);

      pageInfo = this.parsePageInfo(linkHeader);
    } while (pageInfo);

    return allProducts;
  }

  async getProduct(productId) {
    const { data } = await this.request(`/products/${productId}.json`);
    return data.product;
  }

  async getProductCount() {
    const { data } = await this.request('/products/count.json');
    return data.count;
  }
}
