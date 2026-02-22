import { WebhookModel } from '@pricy/shared/db';
import { WebhookService } from '../services/WebhookService.js';
import { logger } from '../lib/logger.js';

const webhookService = new WebhookService();

export default function defineSendWebhook(agenda) {
  agenda.define('send-webhook', { concurrency: 10 }, async (job) => {
    const { webhookId, eventType, payload } = job.attrs.data;

    const webhook = await WebhookModel.findById(webhookId).select('+secret');
    if (!webhook) {
      logger.warn({ webhookId }, 'Webhook not found — skipping');
      return;
    }

    if (!webhook.isActive) {
      logger.info({ webhookId }, 'Webhook inactive — skipping');
      return;
    }

    logger.info({ webhookId, url: webhook.url, event: eventType }, 'Sending webhook');

    const result = await webhookService.send(webhook, {
      event: eventType,
      ...payload
    });

    webhook.lastDeliveredAt = new Date();
    webhook.lastStatus = result.status;

    if (result.success) {
      webhook.failureCount = 0;
      await webhook.save();
      logger.info({ webhookId, status: result.status }, 'Webhook delivered');
    } else {
      webhook.failureCount += 1;
      // Disable webhook after 10 consecutive failures
      if (webhook.failureCount >= 10) {
        webhook.isActive = false;
        logger.warn({ webhookId, failures: webhook.failureCount }, 'Webhook disabled after too many failures');
      }
      await webhook.save();
      throw new Error(`Webhook delivery failed: ${result.error} (status: ${result.status})`);
    }
  });
}
