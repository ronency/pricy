import crypto from 'crypto';
import axios from 'axios';

export class WebhookService {
  generateSignature(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  async send(webhook, payload) {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature({ ...payload, timestamp }, webhook.secret);

      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Pricy-Signature': signature,
          'X-Pricy-Timestamp': timestamp.toString()
        },
        timeout: 10000
      });

      return {
        success: true,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        error: error.message
      };
    }
  }

  async sendToAllWebhooks(webhooks, eventType, payload) {
    const results = [];

    for (const webhook of webhooks) {
      if (!webhook.isActive) continue;

      const shouldSend = webhook.events.includes('all') || webhook.events.includes(eventType);

      if (shouldSend) {
        const result = await this.send(webhook, {
          event: eventType,
          ...payload
        });
        results.push({ webhookId: webhook._id, ...result });
      }
    }

    return results;
  }
}
