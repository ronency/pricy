import { ProductModel } from '../config/productSchema.js';
import { CompetitorModel } from '../config/competitorSchema.js';
import { UserModel } from '../config/userSchema.js';
import { ShopifyService, ShopifyAuthError } from '../services/ShopifyService.js';
import { JobQueueService } from '../services/JobQueueService.js';

export async function getProducts(req, res, next) {
  try {
    const { tracked, page = 1, limit = 50 } = req.query;

    const query = { userId: req.user._id };
    if (tracked !== undefined) {
      query.isTracked = tracked === 'true';
    }

    const products = await ProductModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ProductModel.countDocuments(query);

    res.json({
      products: products.map(p => p.toClient()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await ProductModel.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        error: { message: 'Product not found', code: 'NOT_FOUND' }
      });
    }

    res.json({ product: product.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const product = new ProductModel({
      ...req.validatedBody,
      userId: req.user._id
    });

    await product.save();

    res.status(201).json({ product: product.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await ProductModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        error: { message: 'Product not found', code: 'NOT_FOUND' }
      });
    }

    res.json({ product: product.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const product = await ProductModel.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        error: { message: 'Product not found', code: 'NOT_FOUND' }
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function trackProducts(req, res, next) {
  try {
    const { productIds } = req.validatedBody;

    const updated = await ProductModel.updateMany(
      { _id: { $in: productIds }, userId: req.user._id },
      { isTracked: true }
    );

    res.json({
      message: `${updated.modifiedCount} products now being tracked`
    });
  } catch (error) {
    next(error);
  }
}

export async function syncFromShopify(req, res, next) {
  try {
    if (!req.user.shopifyDomain) {
      return res.status(400).json({
        error: { message: 'Shopify not connected. Please connect your store via OAuth first.', code: 'SHOPIFY_ERROR' }
      });
    }

    // shopifyAccessToken has select:false — re-query to load it
    const userWithToken = await UserModel.findById(req.user._id).select('+shopifyAccessToken');

    if (!userWithToken.shopifyAccessToken) {
      return res.status(400).json({
        error: { message: 'Shopify not connected. Please connect your store via OAuth first.', code: 'SHOPIFY_ERROR' }
      });
    }

    // Check if token has a known expiry and is expired
    if (userWithToken.shopifyTokenExpiresAt && userWithToken.shopifyTokenExpiresAt < new Date()) {
      return res.status(401).json({
        error: {
          message: 'Shopify access token has expired. Please reconnect your store via OAuth.',
          code: 'SHOPIFY_TOKEN_EXPIRED'
        }
      });
    }

    const shopify = new ShopifyService(
      userWithToken.shopifyDomain,
      userWithToken.shopifyAccessToken
    );

    let products;
    try {
      products = await shopify.getProducts();
    } catch (error) {
      if (error instanceof ShopifyAuthError) {
        return res.status(401).json({
          error: {
            message: error.message,
            code: error.code
          }
        });
      }
      throw error;
    }

    let created = 0;
    let updated = 0;

    for (const shopifyProduct of products) {
      const existing = await ProductModel.findOne({
        userId: req.user._id,
        shopifyProductId: shopifyProduct.id.toString()
      });

      const productData = {
        shopifyProductId: shopifyProduct.id.toString(),
        title: shopifyProduct.title,
        description: shopifyProduct.body_html || '',
        vendor: shopifyProduct.vendor || '',
        productType: shopifyProduct.product_type || '',
        handle: shopifyProduct.handle || '',
        imageUrl: shopifyProduct.image?.src || null,
        variants: shopifyProduct.variants.map(v => ({
          shopifyVariantId: v.id.toString(),
          title: v.title,
          sku: v.sku || '',
          price: parseFloat(v.price),
          compareAtPrice: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
          inventoryQuantity: v.inventory_quantity || 0
        })),
        currentPrice: parseFloat(shopifyProduct.variants[0]?.price) || null,
        lastSyncedAt: new Date()
      };

      if (existing) {
        await ProductModel.findByIdAndUpdate(existing._id, productData);
        updated++;
      } else {
        await ProductModel.create({
          ...productData,
          userId: req.user._id,
          isTracked: false
        });
        created++;
      }
    }

    res.json({
      message: 'Sync complete',
      created,
      updated,
      total: products.length
    });
  } catch (error) {
    next(error);
  }
}

export async function scanPrices(req, res, next) {
  try {
    const trackedProducts = await ProductModel.find({
      userId: req.user._id,
      isTracked: true
    });

    if (trackedProducts.length === 0) {
      return res.json({
        message: 'No tracked products found. Toggle tracking on for at least one product.',
        queued: 0, trackedProducts: 0, competitors: 0
      });
    }

    const trackedProductIds = trackedProducts.map(p => p._id);

    const competitors = await CompetitorModel.find({
      userId: req.user._id,
      isActive: true,
      productId: { $in: trackedProductIds }
    });

    if (competitors.length === 0) {
      return res.json({
        message: `Found ${trackedProducts.length} tracked product(s) but no competitors linked to them.`,
        queued: 0,
        trackedProducts: trackedProducts.length, competitors: 0
      });
    }

    for (const competitor of competitors) {
      await JobQueueService.enqueue('check-competitor', {
        competitorId: competitor._id.toString(),
        userId: req.user._id.toString()
      });
    }

    res.json({
      message: `Queued ${competitors.length} price checks`,
      queued: competitors.length,
      trackedProducts: trackedProducts.length,
      competitors: competitors.length
    });
  } catch (error) {
    next(error);
  }
}
