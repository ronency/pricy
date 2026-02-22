import { RuleModel, EventModel, WebhookModel } from '@pricy/shared/db';
import { logger } from '../lib/logger.js';

export class RuleEngineService {
  constructor(agenda) {
    this.agenda = agenda;
  }

  async evaluatePriceChange(competitor, product, newPrice, previousPrice) {
    if (!previousPrice || newPrice === previousPrice) return [];

    const priceChange = newPrice - previousPrice;
    const priceChangePercent = (priceChange / previousPrice) * 100;

    const rules = await RuleModel.find({
      userId: competitor.userId,
      isActive: true,
      $or: [
        { productId: null },
        { productId: competitor.productId }
      ]
    }).sort({ priority: -1 });

    const triggeredRules = [];

    for (const rule of rules) {
      const triggered = this.evaluateRule(rule, {
        newPrice,
        previousPrice,
        priceChange,
        priceChangePercent,
        myPrice: product.currentPrice,
        competitor,
        product
      });

      if (triggered) {
        triggeredRules.push(rule);
        await this.executeRuleActions(rule, {
          competitor,
          product,
          newPrice,
          previousPrice,
          priceChange,
          priceChangePercent
        });
      }
    }

    return triggeredRules;
  }

  evaluateRule(rule, context) {
    const { newPrice, previousPrice, priceChange, priceChangePercent, myPrice } = context;

    switch (rule.type) {
      case 'price_below':
        return myPrice && newPrice < myPrice * (1 - (rule.conditions.thresholdPercent || 0) / 100);

      case 'price_above':
        return myPrice && newPrice > myPrice * (1 + (rule.conditions.thresholdPercent || 0) / 100);

      case 'price_drop_percent':
        return priceChangePercent < 0 && Math.abs(priceChangePercent) >= (rule.conditions.thresholdPercent || 0);

      case 'price_drop_amount':
        return priceChange < 0 && Math.abs(priceChange) >= (rule.conditions.thresholdAmount || 0);

      case 'margin_impact': {
        if (!myPrice) return false;
        const marginImpact = (myPrice - newPrice);
        return rule.conditions.thresholdAmount && marginImpact >= rule.conditions.thresholdAmount;
      }

      case 'competitor_any_change':
        return priceChange !== 0;

      default:
        return false;
    }
  }

  async executeRuleActions(rule, context) {
    const { competitor, product, newPrice, previousPrice, priceChange, priceChangePercent } = context;

    rule.lastTriggeredAt = new Date();
    rule.triggerCount += 1;
    await rule.save();

    for (const action of rule.actions) {
      switch (action.type) {
        case 'log':
          await this.createEvent(rule, context);
          break;

        case 'email':
          await this.createEvent(rule, context, true);
          break;

        case 'webhook':
          await this.enqueueWebhooks(rule, context);
          break;
      }
    }
  }

  async createEvent(rule, context, notify = false) {
    const { competitor, product, newPrice, previousPrice, priceChangePercent } = context;

    const severity = Math.abs(priceChangePercent) > 10 ? 'alert' :
                     Math.abs(priceChangePercent) > 5 ? 'warning' : 'info';

    const event = new EventModel({
      userId: rule.userId,
      productId: competitor.productId,
      competitorId: competitor._id,
      ruleId: rule._id,
      type: 'rule_triggered',
      severity,
      title: `Rule "${rule.name}" triggered`,
      message: `${competitor.name} price changed from ${previousPrice} to ${newPrice} (${priceChangePercent.toFixed(2)}%)`,
      data: {
        ruleName: rule.name,
        ruleType: rule.type,
        competitorName: competitor.name,
        productTitle: product.title,
        newPrice,
        previousPrice,
        priceChange: context.priceChange,
        priceChangePercent
      },
      isNotified: notify
    });

    await event.save();
    return event;
  }

  async enqueueWebhooks(rule, context) {
    const webhooks = await WebhookModel.find({
      userId: rule.userId,
      isActive: true
    });

    if (!this.agenda) return;

    for (const webhook of webhooks) {
      const shouldSend = webhook.events.includes('all') || webhook.events.includes('rule_triggered');
      if (shouldSend) {
        await this.agenda.now('send-webhook', {
          webhookId: webhook._id.toString(),
          eventType: 'rule_triggered',
          payload: {
            rule: rule.toClient(),
            competitor: context.competitor.toClient(),
            product: context.product.toClient(),
            priceData: {
              newPrice: context.newPrice,
              previousPrice: context.previousPrice,
              priceChange: context.priceChange,
              priceChangePercent: context.priceChangePercent
            }
          }
        });
      }
    }
  }
}
