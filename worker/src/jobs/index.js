import defineHourlyPriceCheck from './hourlyPriceCheck.js';
import defineDailyPriceCheck from './dailyPriceCheck.js';
import defineCheckCompetitor from './checkCompetitor.js';
import defineSendWebhook from './sendWebhook.js';
import defineSendEmail from './sendEmail.js';
import defineStripeReconciliation from './stripeReconciliation.js';
import defineWeeklyDigest from './weeklyDigest.js';

export function registerAllJobs(agenda) {
  defineHourlyPriceCheck(agenda);
  defineDailyPriceCheck(agenda);
  defineCheckCompetitor(agenda);
  defineSendWebhook(agenda);
  defineSendEmail(agenda);
  defineStripeReconciliation(agenda);
  defineWeeklyDigest(agenda);
}
