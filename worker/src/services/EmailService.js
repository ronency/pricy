import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import { getMailgunClient, getMailgunDomain, getFromEmail } from '../config/mailgun.js';
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
  async sendPriceAlert({ email, userName, competitorName, productTitle, newPrice, previousPrice, priceChange, priceChangePercent }) {
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
    });
  }

  async sendWeeklyDigest({ email, userName, events, startDate, endDate }) {
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
    });
  }

  async send({ to, subject, html }) {
    const mg = getMailgunClient();
    if (!mg) {
      logger.warn({ to, subject }, 'Mailgun not configured — skipping email');
      return { skipped: true };
    }

    const domain = getMailgunDomain();
    const from = getFromEmail();

    const result = await mg.messages.create(domain, {
      from,
      to: [to],
      subject,
      html,
    });

    logger.info({ to, subject, id: result.id }, 'Email sent');
    return result;
  }
}
