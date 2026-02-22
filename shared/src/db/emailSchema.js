import mongoose from 'mongoose';

const emailSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true
  },
  from: {
    type: String
  },
  subject: {
    type: String,
    required: true
  },
  html: {
    type: String,
    required: true
  },
  type: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['saved', 'sent', 'failed'],
    default: 'saved'
  },
  sentAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

emailSchema.methods.toClient = function() {
  return {
    id: this._id,
    to: this.to,
    from: this.from,
    subject: this.subject,
    html: this.html,
    type: this.type,
    userId: this.userId,
    status: this.status,
    sentAt: this.sentAt,
    metadata: this.metadata,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

emailSchema.index({ createdAt: -1 });
emailSchema.index({ userId: 1 });
emailSchema.index({ type: 1 });

export const EmailModel = mongoose.model('Email', emailSchema);
