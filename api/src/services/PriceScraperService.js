import axios from 'axios';
import * as cheerio from 'cheerio';
import { sanitizePrice } from '@pricy/shared';

export class PriceScraperService {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];

    this.defaultSelectors = [
      '[data-price]',
      '.price',
      '.product-price',
      '#price',
      '[itemprop="price"]',
      '.sale-price',
      '.current-price',
      '.ProductPrice',
      '.product__price',
      '[class*="price"]'
    ];
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async scrapePrice(url, customSelectors = null) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);

      let price = null;
      let currency = null;

      // 1. Try OpenGraph price meta tags first
      const ogPrice = $('meta[property="og:price:amount"]').attr('content');
      const ogCurrency = $('meta[property="og:price:currency"]').attr('content');
      if (ogPrice) {
        price = sanitizePrice(ogPrice);
        if (price && ogCurrency) {
          currency = ogCurrency.toUpperCase();
        }
      }

      // 2. Fall back to DOM selectors
      const selectors = customSelectors?.priceSelector
        ? [customSelectors.priceSelector, ...this.defaultSelectors]
        : this.defaultSelectors;

      if (price === null) for (const selector of selectors) {
        const element = $(selector).first();

        if (element.length) {
          // Check data-price attribute first
          const dataPrice = element.attr('data-price');
          if (dataPrice) {
            price = sanitizePrice(dataPrice);
            if (price) break;
          }

          // Then check content attribute (for meta tags)
          const contentPrice = element.attr('content');
          if (contentPrice) {
            price = sanitizePrice(contentPrice);
            if (price) break;
          }

          // Finally check text content
          const textPrice = element.text().trim();
          if (textPrice) {
            price = sanitizePrice(textPrice);
            if (price) break;
          }
        }
      }

      // Try to detect currency if not already found via OG tags
      if (!currency) {
        const currencyMatch = response.data.match(/["']currency["']\s*:\s*["']([A-Z]{3})["']/);
        if (currencyMatch) {
          currency = currencyMatch[1];
        }
      }

      // Extract page metadata
      const canonicalUrl = $('link[rel="canonical"]').attr('href') || null;
      const imageUrl = $('meta[property="og:image"]').attr('content') || null;

      if (price !== null) {
        return {
          success: true,
          price,
          currency,
          canonicalUrl,
          imageUrl,
          scrapedAt: new Date()
        };
      }

      return {
        success: false,
        error: 'Could not extract price from page',
        scrapedAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        scrapedAt: new Date()
      };
    }
  }

  async scrapeWithPuppeteer(url, customSelectors = null) {
    let browser = null;

    try {
      const puppeteer = await import('puppeteer');
      browser = await puppeteer.default.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent(this.getRandomUserAgent());
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      let price = null;
      let currency = null;

      // 1. Try OpenGraph price meta tags and page metadata
      const ogData = await page.evaluate(() => {
        const amount = document.querySelector('meta[property="og:price:amount"]')?.content;
        const curr = document.querySelector('meta[property="og:price:currency"]')?.content;
        const canonical = document.querySelector('link[rel="canonical"]')?.href;
        const image = document.querySelector('meta[property="og:image"]')?.content;
        return { amount, currency: curr, canonicalUrl: canonical || null, imageUrl: image || null };
      });
      if (ogData.amount) {
        price = sanitizePrice(ogData.amount);
        if (price && ogData.currency) {
          currency = ogData.currency.toUpperCase();
        }
      }

      // 2. Fall back to DOM selectors
      const selectors = customSelectors?.priceSelector
        ? [customSelectors.priceSelector, ...this.defaultSelectors]
        : this.defaultSelectors;

      if (price === null) for (const selector of selectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await page.evaluate(el => el.textContent || el.getAttribute('data-price') || el.getAttribute('content'), element);
            price = sanitizePrice(text);
            if (price) break;
          }
        } catch {
          continue;
        }
      }

      if (price !== null) {
        return {
          success: true,
          price,
          currency,
          canonicalUrl: ogData.canonicalUrl,
          imageUrl: ogData.imageUrl,
          scrapedAt: new Date()
        };
      }

      return {
        success: false,
        error: 'Could not extract price from page',
        scrapedAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        scrapedAt: new Date()
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
