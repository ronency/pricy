import { JobQueueService } from '../services/JobQueueService.js';

const ALLOWED_JOBS = {
  'hourly-price-check': { params: [] },
  'daily-price-check': { params: [] },
  'check-competitor': { params: ['competitorId'] },
  'send-webhook': { params: ['webhookId', 'payload'] },
  'send-email': { params: ['type', 'email'] },
  'stripe-reconciliation': { params: [] },
  'weekly-digest': { params: ['userId'] }
};

export async function triggerJob(req, res, next) {
  try {
    const { jobName, data = {} } = req.body;

    if (!jobName) {
      return res.status(400).json({
        error: { message: 'jobName is required', code: 'VALIDATION_ERROR' }
      });
    }

    if (!ALLOWED_JOBS[jobName]) {
      return res.status(400).json({
        error: { message: `Unknown job: ${jobName}. Allowed: ${Object.keys(ALLOWED_JOBS).join(', ')}`, code: 'VALIDATION_ERROR' }
      });
    }

    await JobQueueService.enqueue(jobName, data);

    res.json({
      success: true,
      jobName,
      data,
      queued: true
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecentJobs(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const jobs = await JobQueueService.getRecent(limit);

    res.json({
      jobs: jobs.map(j => ({
        id: j._id,
        name: j.name,
        data: j.data,
        nextRunAt: j.nextRunAt,
        lastRunAt: j.lastRunAt,
        lastFinishedAt: j.lastFinishedAt,
        failCount: j.failCount,
        failReason: j.failReason,
        failedAt: j.failedAt,
        lockedAt: j.lockedAt,
        disabled: j.disabled
      })),
      total: jobs.length
    });
  } catch (error) {
    next(error);
  }
}

export function getAvailableJobs(req, res) {
  res.json({
    jobs: Object.entries(ALLOWED_JOBS).map(([name, config]) => ({
      name,
      params: config.params
    }))
  });
}
