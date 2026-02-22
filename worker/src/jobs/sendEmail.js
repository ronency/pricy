import { UserModel } from '@pricy/shared/db';
import { EmailService } from '../services/EmailService.js';
import { logger } from '../lib/logger.js';

const emailService = new EmailService();

export default function defineSendEmail(agenda) {
  agenda.define('send-email', { concurrency: 5 }, async (job) => {
    const { type, userId, ...emailData } = job.attrs.data;

    const user = await UserModel.findById(userId);
    if (!user) {
      logger.warn({ userId }, 'User not found — skipping email');
      return;
    }

    if (!user.emailNotifications) {
      logger.info({ userId, type }, 'Email notifications disabled — skipping');
      return;
    }

    logger.info({ type, to: user.email }, 'Sending email');

    switch (type) {
      case 'price-alert':
        await emailService.sendPriceAlert({
          email: user.email,
          userName: user.name,
          ...emailData,
        });
        break;

      case 'weekly-digest':
        await emailService.sendWeeklyDigest({
          email: user.email,
          userName: user.name,
          ...emailData,
        });
        break;

      default:
        logger.warn({ type }, 'Unknown email type');
        return;
    }

    logger.info({ type, to: user.email }, 'Email sent');
  });
}
