import { describe, it, expect } from 'vitest';
import {
  validateUser,
  validateLogin,
  validateProduct,
  validateCompetitor,
  validateRule
} from '@pricy/shared';

describe('User Validation', () => {
  it('should validate a valid user', () => {
    const user = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };
    const result = validateUser(user);
    expect(result.error).toBeUndefined();
  });

  it('should reject invalid email', () => {
    const user = {
      email: 'invalid-email',
      password: 'password123',
      name: 'Test User'
    };
    const result = validateUser(user);
    expect(result.error).toBeDefined();
  });

  it('should reject short password', () => {
    const user = {
      email: 'test@example.com',
      password: 'short',
      name: 'Test User'
    };
    const result = validateUser(user);
    expect(result.error).toBeDefined();
  });
});

describe('Login Validation', () => {
  it('should validate valid login credentials', () => {
    const credentials = {
      email: 'test@example.com',
      password: 'password123'
    };
    const result = validateLogin(credentials);
    expect(result.error).toBeUndefined();
  });

  it('should reject missing email', () => {
    const credentials = {
      password: 'password123'
    };
    const result = validateLogin(credentials);
    expect(result.error).toBeDefined();
  });
});

describe('Product Validation', () => {
  it('should validate a valid product', () => {
    const product = {
      title: 'Test Product',
      currentPrice: 99.99
    };
    const result = validateProduct(product);
    expect(result.error).toBeUndefined();
  });

  it('should reject empty title', () => {
    const product = {
      title: '',
      currentPrice: 99.99
    };
    const result = validateProduct(product);
    expect(result.error).toBeDefined();
  });
});

describe('Competitor Validation', () => {
  it('should validate a valid competitor', () => {
    const competitor = {
      productId: '507f1f77bcf86cd799439011',
      name: 'Amazon',
      url: 'https://www.amazon.com/product'
    };
    const result = validateCompetitor(competitor);
    expect(result.error).toBeUndefined();
  });

  it('should reject invalid URL', () => {
    const competitor = {
      productId: '507f1f77bcf86cd799439011',
      name: 'Amazon',
      url: 'not-a-valid-url'
    };
    const result = validateCompetitor(competitor);
    expect(result.error).toBeDefined();
  });
});

describe('Rule Validation', () => {
  it('should validate a valid rule', () => {
    const rule = {
      name: 'Price Drop Alert',
      type: 'price_drop_percent',
      conditions: {
        thresholdPercent: 5
      },
      actions: [
        { type: 'log' }
      ]
    };
    const result = validateRule(rule);
    expect(result.error).toBeUndefined();
  });

  it('should reject invalid rule type', () => {
    const rule = {
      name: 'Invalid Rule',
      type: 'invalid_type',
      conditions: {},
      actions: [{ type: 'log' }]
    };
    const result = validateRule(rule);
    expect(result.error).toBeDefined();
  });
});
