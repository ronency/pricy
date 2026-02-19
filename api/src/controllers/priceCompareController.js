import { PriceScraperService } from '../services/PriceScraperService.js';
import { calculatePriceChange, extractDomain } from '@pricy/shared';

const scraper = new PriceScraperService();

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getSuggestion(diffPercent) {
  if (diffPercent < -20) {
    return "You're significantly undercutting. Consider raising your price to capture more margin.";
  } else if (diffPercent < -5) {
    return "You're well-positioned below the competitor. Your pricing is competitive.";
  } else if (diffPercent < 0) {
    return 'Prices are very close. Monitor frequently for changes.';
  } else if (diffPercent === 0) {
    return 'Prices match. Consider differentiating on value-adds or shipping.';
  } else if (diffPercent <= 5) {
    return 'Slightly above competitor. A small discount could win price-sensitive buyers.';
  } else if (diffPercent <= 20) {
    return 'Noticeably more expensive. Consider matching or highlighting premium value.';
  } else {
    return 'Significantly more expensive. Review your pricing strategy or emphasize unique value.';
  }
}

function getPosition(diffPercent) {
  if (diffPercent < 0) return 'cheaper';
  if (diffPercent === 0) return 'same';
  return 'more_expensive';
}

async function scrapeWithFallback(url) {
  const result = await scraper.scrapePrice(url);
  if (result.success) return result;

  // Fallback to Puppeteer
  return scraper.scrapeWithPuppeteer(url);
}

export async function auditPrice(req, res, next) {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: { message: 'url is required', code: 'VALIDATION_ERROR' }
      });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({
        error: { message: 'Must be a valid HTTP/HTTPS URL', code: 'VALIDATION_ERROR' }
      });
    }

    const result = await scrapeWithFallback(url);

    if (!result.success) {
      return res.status(422).json({
        error: { message: `Could not extract price: ${result.error}`, code: 'SCRAPE_FAILED' }
      });
    }

    const price = result.price;
    const currency = result.currency || 'USD';
    const domain = extractDomain(url);

    // Estimate recoverable margin (8-15% band based on price tier)
    const inefficiency = price > 200 ? 0.12 : price > 50 ? 0.10 : 0.08;
    const monthlyUnits = price > 200 ? 45 : price > 50 ? 120 : 300;
    const monthlyRecovery = Math.round(price * inefficiency * monthlyUnits);

    res.json({
      url,
      price,
      currency,
      domain,
      potentialMonthlyRecovery: monthlyRecovery,
      inefficiencyPercent: Math.round(inefficiency * 100)
    });
  } catch (error) {
    next(error);
  }
}

export async function comparePrices(req, res, next) {
  try {
    const { yourUrl, competitorUrl } = req.body;

    if (!yourUrl || !competitorUrl) {
      return res.status(400).json({
        error: { message: 'Both yourUrl and competitorUrl are required', code: 'VALIDATION_ERROR' }
      });
    }

    if (!isValidUrl(yourUrl) || !isValidUrl(competitorUrl)) {
      return res.status(400).json({
        error: { message: 'Both URLs must be valid HTTP/HTTPS URLs', code: 'VALIDATION_ERROR' }
      });
    }

    const [yourResult, competitorResult] = await Promise.all([
      scrapeWithFallback(yourUrl),
      scrapeWithFallback(competitorUrl)
    ]);

    if (!yourResult.success) {
      return res.status(422).json({
        error: { message: `Could not extract price from your product URL: ${yourResult.error}`, code: 'SCRAPE_FAILED' }
      });
    }

    if (!competitorResult.success) {
      return res.status(422).json({
        error: { message: `Could not extract price from competitor URL: ${competitorResult.error}`, code: 'SCRAPE_FAILED' }
      });
    }

    const priceChange = calculatePriceChange(yourResult.price, competitorResult.price);
    const diffPercent = priceChange ? priceChange.changePercent : 0;
    const diffAmount = priceChange ? priceChange.change : 0;

    res.json({
      yourProduct: {
        url: yourUrl,
        price: yourResult.price,
        currency: yourResult.currency || 'USD'
      },
      competitor: {
        url: competitorUrl,
        price: competitorResult.price,
        currency: competitorResult.currency || 'USD'
      },
      analysis: {
        priceDifference: diffAmount,
        priceDifferencePercent: diffPercent,
        position: getPosition(diffPercent),
        suggestion: getSuggestion(diffPercent)
      }
    });
  } catch (error) {
    next(error);
  }
}
