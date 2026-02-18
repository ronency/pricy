import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { UserModel } from '../config/userSchema.js';
import { ProductModel } from '../config/productSchema.js';
import { CompetitorModel } from '../config/competitorSchema.js';
import { RuleModel } from '../config/ruleSchema.js';
import { generateApiKey, generateWebhookSecret, PlanLimits } from '@pricy/shared';

async function seed() {
  console.log('🌱 Starting database seed...');

  await connectDatabase();

  // Create test user
  const existingUser = await UserModel.findOne({ email: 'test@example.com' });
  if (existingUser) {
    console.log('⚠️ Test user already exists, skipping seed');
    await disconnectDatabase();
    return;
  }

  const user = await UserModel.create({
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    apiKey: generateApiKey(),
    webhookSecret: generateWebhookSecret(),
    plan: 'pro',
    planLimits: PlanLimits.pro
  });

  console.log('✅ Created test user:', user.email);
  console.log('🔑 API Key:', user.apiKey);

  // Create test products
  const products = await ProductModel.create([
    {
      userId: user._id,
      title: 'Premium Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      vendor: 'AudioTech',
      currentPrice: 199.99,
      currency: 'USD',
      isTracked: true
    },
    {
      userId: user._id,
      title: 'Smart Watch Pro',
      description: 'Advanced fitness tracking smartwatch',
      vendor: 'TechWear',
      currentPrice: 349.99,
      currency: 'USD',
      isTracked: true
    }
  ]);

  console.log(`✅ Created ${products.length} test products`);

  // Create test competitors
  const competitors = await CompetitorModel.create([
    {
      userId: user._id,
      productId: products[0]._id,
      name: 'Amazon',
      url: 'https://www.amazon.com/example-headphones',
      domain: 'amazon.com',
      currentPrice: 189.99,
      currency: 'USD'
    },
    {
      userId: user._id,
      productId: products[0]._id,
      name: 'Best Buy',
      url: 'https://www.bestbuy.com/example-headphones',
      domain: 'bestbuy.com',
      currentPrice: 209.99,
      currency: 'USD'
    },
    {
      userId: user._id,
      productId: products[1]._id,
      name: 'Amazon',
      url: 'https://www.amazon.com/example-smartwatch',
      domain: 'amazon.com',
      currentPrice: 329.99,
      currency: 'USD'
    }
  ]);

  console.log(`✅ Created ${competitors.length} test competitors`);

  // Create test rules
  const rules = await RuleModel.create([
    {
      userId: user._id,
      name: 'Alert on 5% price drop',
      type: 'price_drop_percent',
      conditions: {
        thresholdPercent: 5
      },
      actions: [
        { type: 'log' },
        { type: 'email' }
      ],
      priority: 10,
      isActive: true
    },
    {
      userId: user._id,
      productId: products[0]._id,
      name: 'Competitor below my price',
      type: 'price_below',
      conditions: {
        thresholdPercent: 0
      },
      actions: [
        { type: 'log' },
        { type: 'webhook' }
      ],
      priority: 20,
      isActive: true
    }
  ]);

  console.log(`✅ Created ${rules.length} test rules`);

  await disconnectDatabase();
  console.log('✅ Seed complete!');
}

seed().catch(error => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
