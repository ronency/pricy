import { describe, it, expect } from 'vitest';
import {
  extractDomain,
  calculatePriceChange,
  formatPrice,
  generateApiKey,
  sanitizePrice,
  chunk
} from '@pricy/shared';

describe('extractDomain', () => {
  it('should extract domain from URL', () => {
    expect(extractDomain('https://www.amazon.com/product/123')).toBe('www.amazon.com');
    expect(extractDomain('https://bestbuy.com/item')).toBe('bestbuy.com');
  });

  it('should return null for invalid URL', () => {
    expect(extractDomain('not-a-url')).toBeNull();
  });
});

describe('calculatePriceChange', () => {
  it('should calculate price change correctly', () => {
    const result = calculatePriceChange(90, 100);
    expect(result.change).toBe(-10);
    expect(result.changePercent).toBe(-10);
  });

  it('should handle price increase', () => {
    const result = calculatePriceChange(110, 100);
    expect(result.change).toBe(10);
    expect(result.changePercent).toBe(10);
  });

  it('should return null for zero previous price', () => {
    expect(calculatePriceChange(100, 0)).toBeNull();
  });
});

describe('formatPrice', () => {
  it('should format USD correctly', () => {
    expect(formatPrice(99.99, 'USD')).toBe('$99.99');
  });

  it('should format EUR correctly', () => {
    expect(formatPrice(99.99, 'EUR')).toBe('€99.99');
  });
});

describe('generateApiKey', () => {
  it('should generate key with pk_ prefix', () => {
    const key = generateApiKey();
    expect(key.startsWith('pk_')).toBe(true);
  });

  it('should generate unique keys', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toBe(key2);
  });
});

describe('sanitizePrice', () => {
  it('should extract price from string', () => {
    expect(sanitizePrice('$99.99')).toBe(99.99);
    expect(sanitizePrice('€199,99')).toBe(199.99);
    expect(sanitizePrice('Price: 49.99 USD')).toBe(49.99);
  });

  it('should handle number input', () => {
    expect(sanitizePrice(99.99)).toBe(99.99);
  });

  it('should return null for invalid input', () => {
    expect(sanitizePrice('')).toBeNull();
    expect(sanitizePrice(null)).toBeNull();
  });
});

describe('chunk', () => {
  it('should split array into chunks', () => {
    const arr = [1, 2, 3, 4, 5];
    const chunks = chunk(arr, 2);
    expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should handle empty array', () => {
    expect(chunk([], 2)).toEqual([]);
  });
});
