import definePriceCheck from './priceCheck.js';
import defineCheckCompetitor from './checkCompetitor.js';
import defineSendWebhook from './sendWebhook.js';
import defineSendEmail from './sendEmail.js';
import defineStripeReconciliation from './stripeReconciliation.js';
import defineWeeklyDigest from './weeklyDigest.js';

export function registerAllJobs(agenda) {
  definePriceCheck(agenda);
  defineCheckCompetitor(agenda);
  defineSendWebhook(agenda);
  defineSendEmail(agenda);
  defineStripeReconciliation(agenda);
  defineWeeklyDigest(agenda);
}
