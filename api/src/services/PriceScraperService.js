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
      const selectors = customSelectors?.priceSelector
        ? [customSelectors.priceSelector, ...this.defaultSelectors]
        : this.defaultSelectors;

      let price = null;
      let currency = null;

      for (const selector of selectors) {
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

      // Try to detect currency
      const currencyMatch = response.data.match(/["']currency["']\s*:\s*["']([A-Z]{3})["']/);
      if (currencyMatch) {
        currency = currencyMatch[1];
      }

      if (price !== null) {
        return {
          success: true,
          price,
          currency,
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

      const selectors = customSelectors?.priceSelector
        ? [customSelectors.priceSelector, ...this.defaultSelectors]
        : this.defaultSelectors;

      let price = null;

      for (const selector of selectors) {
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
