import { PriceScraperService } from '../services/PriceScraperService.js';
import { calculatePriceChange, extractDomain, convertCurrency } from '@pricy/shared';
import { getRates } from '../services/ExchangeRateService.js';

const scraper = new PriceScraperService();

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getSuggestion(diffPercent, currencyNote) {
  let suggestion;
  if (diffPercent < -20) {
    suggestion = "You're significantly undercutting. Consider raising your price to capture more margin.";
  } else if (diffPercent < -5) {
    suggestion = "You're well-positioned below the competitor. Your pricing is competitive.";
  } else if (diffPercent < 0) {
    suggestion = 'Prices are very close. Monitor frequently for changes.';
  } else if (diffPercent === 0) {
    suggestion = 'Prices match. Consider differentiating on value-adds or shipping.';
  } else if (diffPercent <= 5) {
    suggestion = 'Slightly above competitor. A small discount could win price-sensitive buyers.';
  } else if (diffPercent <= 20) {
    suggestion = 'Noticeably more expensive. Consider matching or highlighting premium value.';
  } else {
    suggestion = 'Significantly more expensive. Review your pricing strategy or emphasize unique value.';
  }
  if (currencyNote) {
    suggestion += ` (Note: ${currencyNote})`;
  }
  return suggestion;
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

    const yourCurrency = (yourResult.currency || 'USD').toUpperCase();
    const compCurrency = (competitorResult.currency || 'USD').toUpperCase();

    let competitorPriceForComparison = competitorResult.price;
    let currencyConversion = { applied: false };
    let currencyNote = null;

    if (yourCurrency !== compCurrency) {
      const rates = await getRates();
      const converted = convertCurrency(competitorResult.price, compCurrency, yourCurrency, rates);
      if (converted != null) {
        const fromRate = rates[compCurrency];
        const toRate = rates[yourCurrency];
        const exchangeRate = Math.round((toRate / fromRate) * 10000) / 10000;

        competitorPriceForComparison = converted;
        currencyNote = `Competitor price converted from ${compCurrency} to ${yourCurrency} using daily exchange rates`;
        currencyConversion = {
          applied: true,
          competitorOriginalPrice: competitorResult.price,
          competitorOriginalCurrency: compCurrency,
          competitorConvertedPrice: converted,
          targetCurrency: yourCurrency,
          exchangeRate,
          note: `Competitor price converted from ${compCurrency} to ${yourCurrency} for comparison`
        };
      }
    }

    const priceChange = calculatePriceChange(yourResult.price, competitorPriceForComparison);
    const diffPercent = priceChange ? priceChange.changePercent : 0;
    const diffAmount = priceChange ? priceChange.change : 0;

    res.json({
      yourProduct: {
        url: yourUrl,
        price: yourResult.price,
        currency: yourCurrency
      },
      competitor: {
        url: competitorUrl,
        price: competitorResult.price,
        currency: compCurrency
      },
      analysis: {
        priceDifference: diffAmount,
        priceDifferencePercent: diffPercent,
        position: getPosition(diffPercent),
        suggestion: getSuggestion(diffPercent, currencyNote),
        currencyConversion
      }
    });
  } catch (error) {
    next(error);
  }
}
