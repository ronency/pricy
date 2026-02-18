import { ProductModel } from '../config/productSchema.js';
import { ShopifyService } from '../services/ShopifyService.js';

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
    if (!req.user.shopifyDomain || !req.user.shopifyAccessToken) {
      return res.status(400).json({
        error: { message: 'Shopify not connected', code: 'SHOPIFY_ERROR' }
      });
    }

    const shopify = new ShopifyService(
      req.user.shopifyDomain,
      req.user.shopifyAccessToken
    );

    const products = await shopify.getProducts();

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
