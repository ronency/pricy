import { CompetitorModel } from '../config/competitorSchema.js';
import { ProductModel } from '../config/productSchema.js';
import { PriceScraperService } from '../services/PriceScraperService.js';
import { PriceCheckService } from '../services/PriceCheckService.js';
import { extractDomain } from '@pricy/shared';

export async function getCompetitors(req, res, next) {
  try {
    const { product_id, active } = req.query;

    const query = { userId: req.user._id };
    if (product_id) query.productId = product_id;
    if (active !== undefined) query.isActive = active === 'true';

    const competitors = await CompetitorModel
      .find(query)
      .sort({ createdAt: -1 });

    res.json({
      competitors: competitors.map(c => c.toClient())
    });
  } catch (error) {
    next(error);
  }
}

export async function getCompetitor(req, res, next) {
  try {
    const competitor = await CompetitorModel.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!competitor) {
      return res.status(404).json({
        error: { message: 'Competitor not found', code: 'NOT_FOUND' }
      });
    }

    res.json({ competitor: competitor.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function createCompetitor(req, res, next) {
  try {
    const { productId, name, url, currency, selectors } = req.validatedBody;

    const product = await ProductModel.findOne({
      _id: productId,
      userId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        error: { message: 'Product not found', code: 'NOT_FOUND' }
      });
    }

    const domain = extractDomain(url);

    const competitor = new CompetitorModel({
      userId: req.user._id,
      productId,
      name,
      url,
      domain,
      currency,
      selectors
    });

    await competitor.save();

    res.status(201).json({ competitor: competitor.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function updateCompetitor(req, res, next) {
  try {
    const updates = req.validatedBody;

    if (updates.url) {
      updates.domain = extractDomain(updates.url);
    }

    const competitor = await CompetitorModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true }
    );

    if (!competitor) {
      return res.status(404).json({
        error: { message: 'Competitor not found', code: 'NOT_FOUND' }
      });
    }

    res.json({ competitor: competitor.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function deleteCompetitor(req, res, next) {
  try {
    const competitor = await CompetitorModel.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!competitor) {
      return res.status(404).json({
        error: { message: 'Competitor not found', code: 'NOT_FOUND' }
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function checkCompetitorPrice(req, res, next) {
  try {
    const competitor = await CompetitorModel.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!competitor) {
      return res.status(404).json({
        error: { message: 'Competitor not found', code: 'NOT_FOUND' }
      });
    }

    // Use PriceCheckService for the full flow (history, events, rules)
    const priceChecker = new PriceCheckService();
    await priceChecker.checkCompetitor(competitor);

    // Re-read to get updated fields
    const updated = await CompetitorModel.findById(competitor._id);

    res.json({
      competitor: updated.toClient()
    });
  } catch (error) {
    next(error);
  }
}
