import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Plans, PlanLimits } from '@pricy/shared';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  shopifyDomain: {
    type: String,
    default: null,
    sparse: true
  },
  shopifyAccessToken: {
    type: String,
    default: null,
    select: false
  },
  shopifyTokenExpiresAt: {
    type: Date,
    default: null
  },
  shopifyScopes: {
    type: String,
    default: null
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true
  },
  plan: {
    type: String,
    enum: Plans,
    default: 'free'
  },
  planLimits: {
    type: Object,
    default: () => PlanLimits.free
  },
  webhookUrl: {
    type: String,
    default: null
  },
  webhookSecret: {
    type: String,
    default: null,
    select: false
  },
  emailNotifications: {
    type: Boolean,
    default: true
  },
  weeklyDigest: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toClient = function() {
  return {
    id: this._id,
    email: this.email,
    name: this.name,
    shopifyDomain: this.shopifyDomain,
    shopifyConnected: !!this.shopifyDomain,
    shopifyScopes: this.shopifyScopes,
    shopifyTokenExpiresAt: this.shopifyTokenExpiresAt,
    apiKey: this.apiKey,
    plan: this.plan,
    planLimits: this.planLimits,
    webhookUrl: this.webhookUrl,
    emailNotifications: this.emailNotifications,
    weeklyDigest: this.weeklyDigest,
    isActive: this.isActive,
    role: this.role,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

userSchema.index({ email: 1 });
userSchema.index({ apiKey: 1 });
userSchema.index({ shopifyDomain: 1 });

export const UserModel = mongoose.model('User', userSchema);
