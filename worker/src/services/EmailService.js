import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import { getMailgunClient, getMailgunDomain, getFromEmail } from '../config/mailgun.js';
import { EmailModel } from '@pricy/shared/db';
import { logger } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '../templates');

// Cache compiled templates
const templateCache = {};

function getTemplate(name) {
  if (templateCache[name]) return templateCache[name];

  const filePath = path.join(TEMPLATES_DIR, `${name}.html`);
  const source = fs.readFileSync(filePath, 'utf-8');
  templateCache[name] = Handlebars.compile(source);
  return templateCache[name];
}

// Register layout partial
function registerLayout() {
  const layoutPath = path.join(TEMPLATES_DIR, 'layout.html');
  if (fs.existsSync(layoutPath)) {
    const layoutSource = fs.readFileSync(layoutPath, 'utf-8');
    Handlebars.registerPartial('layout', layoutSource);
  }
}

// Register helpers
Handlebars.registerHelper('formatPrice', (price) => {
  if (price == null) return '-';
  return `$${Number(price).toFixed(2)}`;
});

Handlebars.registerHelper('formatPercent', (value) => {
  if (value == null) return '-';
  return `${Number(value).toFixed(2)}%`;
});

Handlebars.registerHelper('formatDate', (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
});

registerLayout();

export class EmailService {
  async sendPriceAlert({ email, userName, userId, competitorName, productTitle, newPrice, previousPrice, priceChange, priceChangePercent }) {
    const template = getTemplate('priceAlert');
    const html = template({
      userName,
      competitorName,
      productTitle,
      newPrice,
      previousPrice,
      priceChange,
      priceChangePercent,
      isDecrease: priceChange < 0,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:7001',
    });

    return this.send({
      to: email,
      subject: `Price Alert: ${competitorName} changed price on ${productTitle}`,
      html,
      type: 'price-alert',
      userId,
    });
  }

  async sendWeeklyDigest({ email, userName, userId, events, startDate, endDate }) {
    const template = getTemplate('weeklyDigest');
    const html = template({
      userName,
      events,
      startDate,
      endDate,
      eventCount: events.length,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:7001',
    });

    return this.send({
      to: email,
      subject: `Pricy Weekly Digest: ${events.length} events this week`,
      html,
      type: 'weekly-digest',
      userId,
    });
  }

  async sendWebhookDisabled({ email, userName, userId, webhookUrl, failureCount, disableReason }) {
    const template = getTemplate('webhookDisabled');
    const html = template({
      userName,
      webhookUrl,
      failureCount,
      disableReason,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:7001',
    });

    return this.send({
      to: email,
      subject: 'Webhook Disabled — Too Many Failures',
      html,
      type: 'webhook-disabled',
      userId,
    });
  }

  async send({ to, subject, html, type = null, userId = null }) {
    const provider = process.env.EMAIL_PROVIDER || 'mailgun';
    const from = getFromEmail();

    if (provider === 'database') {
      const doc = await EmailModel.create({
        to,
        from,
        subject,
        html,
        type,
        userId,
        status: 'saved',
      });
      logger.info({ to, subject, id: doc._id, provider: 'database' }, 'Email saved to database');
      return { id: doc._id, saved: true };
    }

    // Default: mailgun
    const mg = getMailgunClient();
    if (!mg) {
      logger.warn({ to, subject }, 'Mailgun not configured — skipping email');
      return { skipped: true };
    }

    const domain = getMailgunDomain();

    const result = await mg.messages.create(domain, {
      from,
      to: [to],
      subject,
      html,
    });

    // Also save to database for audit trail
    try {
      await EmailModel.create({
        to,
        from,
        subject,
        html,
        type,
        userId,
        status: 'sent',
        sentAt: new Date(),
        metadata: { mailgunId: result.id },
      });
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to save email record');
    }

    logger.info({ to, subject, id: result.id }, 'Email sent');
    return result;
  }
}
