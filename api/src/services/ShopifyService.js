export class ShopifyAuthError extends Error {
  constructor(message = 'Shopify access token is invalid or expired. Please reconnect your Shopify store.') {
    super(message);
    this.name = 'ShopifyAuthError';
    this.code = 'SHOPIFY_TOKEN_EXPIRED';
  }
}

export class ShopifyService {
  constructor(shopDomain, accessToken) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
    this.apiVersion = '2026-01';
    this.graphqlUrl = `https://${shopDomain}/admin/api/${this.apiVersion}/graphql.json`;
  }

  /**
   * Execute a GraphQL query against the Shopify Admin API.
   */
  async query(graphqlQuery, variables = {}) {
    const response = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken
      },
      body: JSON.stringify({ query: graphqlQuery, variables })
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new ShopifyAuthError();
      }
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const json = await response.json();

    if (json.errors?.length) {
      const authError = json.errors.find(e =>
        e.extensions?.code === 'ACCESS_DENIED' || e.message?.includes('access')
      );
      if (authError) {
        throw new ShopifyAuthError();
      }
      throw new Error(json.errors.map(e => e.message).join(', '));
    }

    return json.data;
  }

  /**
   * Extract the numeric ID from a Shopify GID string.
   * e.g. "gid://shopify/Product/12345" → "12345"
   */
  parseGid(gid) {
    if (!gid) return null;
    const parts = gid.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Fetch all products using cursor-based pagination.
   * Returns normalized product objects matching the REST shape
   * so callers don't need to know about GraphQL.
   */
  async getProducts(pageSize = 250) {
    const allProducts = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const data = await this.query(PRODUCTS_QUERY, {
        first: pageSize,
        after: cursor
      });

      const connection = data.products;
      for (const node of connection.nodes) {
        allProducts.push(this.normalizeProduct(node));
      }

      hasNextPage = connection.pageInfo.hasNextPage;
      cursor = connection.pageInfo.endCursor;
    }

    return allProducts;
  }

  /**
   * Fetch a single product by its numeric Shopify ID.
   */
  async getProduct(productId) {
    const gid = `gid://shopify/Product/${productId}`;
    const data = await this.query(PRODUCT_QUERY, { id: gid });

    if (!data.product) return null;
    return this.normalizeProduct(data.product);
  }

  /**
   * Get the total number of products in the store.
   */
  async getProductCount() {
    const data = await this.query(PRODUCT_COUNT_QUERY);
    return data.productsCount.count;
  }

  /**
   * Convert a GraphQL product node into a flat object
   * with the same field names the sync controller expects.
   */
  normalizeProduct(node) {
    return {
      id: this.parseGid(node.id),
      title: node.title,
      body_html: node.descriptionHtml || '',
      vendor: node.vendor || '',
      product_type: node.productType || '',
      handle: node.handle || '',
      image: node.featuredImage ? { src: node.featuredImage.url } : null,
      variants: (node.variants?.nodes || []).map(v => ({
        id: this.parseGid(v.id),
        title: v.title || 'Default',
        sku: v.sku || '',
        price: v.price,
        compare_at_price: v.compareAtPrice,
        inventory_quantity: v.inventoryQuantity ?? 0
      }))
    };
  }
}

// ── GraphQL Queries ──────────────────────────────────────────────

const PRODUCT_FIELDS = `
  id
  title
  descriptionHtml
  vendor
  productType
  handle
  featuredImage {
    url
  }
  variants(first: 100) {
    nodes {
      id
      title
      sku
      price
      compareAtPrice
      inventoryQuantity
    }
  }
`;

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ${PRODUCT_FIELDS}
      }
    }
  }
`;

const PRODUCT_QUERY = `
  query GetProduct($id: ID!) {
    product(id: $id) {
      ${PRODUCT_FIELDS}
    }
  }
`;

const PRODUCT_COUNT_QUERY = `
  query GetProductCount {
    productsCount {
      count
    }
  }
`;
