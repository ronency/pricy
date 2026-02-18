import { WebhookModel } from '../config/webhookSchema.js';
import { WebhookService } from '../services/WebhookService.js';
import { generateWebhookSecret } from '@pricy/shared';

export async function getWebhooks(req, res, next) {
  try {
    const webhooks = await WebhookModel
      .find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      webhooks: webhooks.map(w => w.toClient())
    });
  } catch (error) {
    next(error);
  }
}

export async function getWebhook(req, res, next) {
  try {
    const webhook = await WebhookModel.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!webhook) {
      return res.status(404).json({
        error: { message: 'Webhook not found', code: 'NOT_FOUND' }
      });
    }

    res.json({ webhook: webhook.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function createWebhook(req, res, next) {
  try {
    const secret = generateWebhookSecret();

    const webhook = new WebhookModel({
      ...req.validatedBody,
      userId: req.user._id,
      secret
    });

    await webhook.save();

    res.status(201).json({
      webhook: webhook.toClient(),
      secret,
      message: 'Store the secret securely - it will not be shown again.'
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWebhook(req, res, next) {
  try {
    const webhook = await WebhookModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.validatedBody,
      { new: true }
    );

    if (!webhook) {
      return res.status(404).json({
        error: { message: 'Webhook not found', code: 'NOT_FOUND' }
      });
    }

    res.json({ webhook: webhook.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function deleteWebhook(req, res, next) {
  try {
    const webhook = await WebhookModel.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!webhook) {
      return res.status(404).json({
        error: { message: 'Webhook not found', code: 'NOT_FOUND' }
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function testWebhook(req, res, next) {
  try {
    const webhook = await WebhookModel.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).select('+secret');

    if (!webhook) {
      return res.status(404).json({
        error: { message: 'Webhook not found', code: 'NOT_FOUND' }
      });
    }

    const service = new WebhookService();
    const result = await service.send(webhook, {
      type: 'test',
      message: 'This is a test webhook from Pricy',
      timestamp: new Date().toISOString()
    });

    webhook.lastDeliveredAt = new Date();
    webhook.lastStatus = result.status;

    if (!result.success) {
      webhook.failureCount += 1;
    } else {
      webhook.failureCount = 0;
    }

    await webhook.save();

    res.json({
      success: result.success,
      status: result.status,
      message: result.success ? 'Test webhook sent successfully' : 'Failed to send test webhook'
    });
  } catch (error) {
    next(error);
  }
}
