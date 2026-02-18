import { UserModel } from '../config/userSchema.js';
import { generateToken } from '../middleware/auth.js';
import { generateApiKey as genApiKey, generateWebhookSecret, PlanLimits } from '@pricy/shared';

export async function signup(req, res, next) {
  try {
    const { email, password, name } = req.validatedBody;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        error: { message: 'Email already registered', code: 'CONFLICT' }
      });
    }

    const user = new UserModel({
      email,
      password,
      name,
      planLimits: PlanLimits.free
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      user: user.toClient(),
      token
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.validatedBody;

    const user = await UserModel.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' }
      });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({
        error: { message: 'Invalid credentials', code: 'UNAUTHORIZED' }
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: { message: 'Account is deactivated', code: 'FORBIDDEN' }
      });
    }

    const token = generateToken(user._id);

    res.json({
      user: user.toClient(),
      token
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    res.json({ user: req.user.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const updates = req.body;
    const allowedUpdates = ['name', 'webhookUrl', 'emailNotifications', 'weeklyDigest'];

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        req.user[key] = updates[key];
      }
    });

    await req.user.save();

    res.json({ user: req.user.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function generateApiKey(req, res, next) {
  try {
    const apiKey = genApiKey();
    const webhookSecret = generateWebhookSecret();

    req.user.apiKey = apiKey;
    req.user.webhookSecret = webhookSecret;
    await req.user.save();

    res.json({
      apiKey,
      webhookSecret,
      message: 'API key generated. Store it securely - it will not be shown again.'
    });
  } catch (error) {
    next(error);
  }
}

export async function shopifyOAuth(req, res, next) {
  try {
    const { shop } = req.query;

    if (!shop) {
      return res.status(400).json({
        error: { message: 'Shop parameter required', code: 'VALIDATION_ERROR' }
      });
    }

    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const redirectUri = process.env.SHOPIFY_REDIRECT_URI;
    const scopes = 'read_products';
    const state = Buffer.from(JSON.stringify({ userId: req.user._id })).toString('base64');

    const authUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
}

export async function shopifyCallback(req, res, next) {
  try {
    const { code, shop, state } = req.query;

    if (!code || !shop || !state) {
      return res.status(400).json({
        error: { message: 'Missing required parameters', code: 'VALIDATION_ERROR' }
      });
    }

    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    // Exchange code for access token
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code
      })
    });

    const data = await response.json();

    if (!data.access_token) {
      return res.status(400).json({
        error: { message: 'Failed to get access token', code: 'SHOPIFY_ERROR' }
      });
    }

    await UserModel.findByIdAndUpdate(userId, {
      shopifyDomain: shop,
      shopifyAccessToken: data.access_token
    });

    res.redirect(process.env.FRONTEND_URL || '/');
  } catch (error) {
    next(error);
  }
}
