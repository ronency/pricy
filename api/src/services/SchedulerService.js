import cron from 'node-cron';
import { PriceCheckService } from './PriceCheckService.js';
import { StripeReconciliationService } from './StripeReconciliationService.js';

export class SchedulerService {
  constructor() {
    this.priceCheckService = new PriceCheckService();
    this.reconciliationService = new StripeReconciliationService();
    this.jobs = [];
  }

  start() {
    console.log('⏰ Starting scheduler service...');

    // Hourly price checks (for pro/advanced plans)
    const hourlyJob = cron.schedule('0 * * * *', async () => {
      console.log('🔄 Running hourly price check...');
      try {
        await this.priceCheckService.checkAllCompetitors();
      } catch (error) {
        console.error('❌ Hourly price check failed:', error);
      }
    });
    this.jobs.push(hourlyJob);

    // Daily Stripe reconciliation at 3:00 AM
    const reconcileJob = cron.schedule('0 3 * * *', async () => {
      console.log('🔄 Running Stripe reconciliation...');
      try {
        await this.reconciliationService.run();
      } catch (error) {
        console.error('❌ Stripe reconciliation failed:', error);
      }
    });
    this.jobs.push(reconcileJob);

    console.log('✅ Scheduler service started');
  }

  stop() {
    console.log('⏹️ Stopping scheduler service...');
    for (const job of this.jobs) {
      job.stop();
    }
    this.jobs = [];
    console.log('✅ Scheduler service stopped');
  }

  async runPriceCheckNow() {
    console.log('🔄 Running manual price check...');
    return this.priceCheckService.checkAllCompetitors();
  }
}

let schedulerInstance = null;

export function getScheduler() {
  if (!schedulerInstance) {
    schedulerInstance = new SchedulerService();
  }
  return schedulerInstance;
}
