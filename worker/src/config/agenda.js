import { Agenda } from 'agenda';

export const retryConfig = {
  'check-competitor': { maxRetries: 2, delay: 5 * 60 * 1000, backoff: 'fixed' },
  'send-webhook':     { maxRetries: 5, delay: 60 * 1000, backoff: 'exponential' },
  'send-email':       { maxRetries: 3, delay: 30 * 1000, backoff: 'exponential' },
  'stripe-reconciliation': { maxRetries: 1, delay: 30 * 60 * 1000, backoff: 'fixed' },
  'weekly-digest':    { maxRetries: 1, delay: 60 * 60 * 1000, backoff: 'fixed' },
};

export function createAgenda(mongoUri) {
  const agenda = new Agenda({
    db: {
      address: mongoUri,
      collection: 'agendaJobs',
    },
    processEvery: '30 seconds',
    maxConcurrency: 20,
    defaultLockLifetime: 10 * 60 * 1000, // 10 minutes
  });

  return agenda;
}
