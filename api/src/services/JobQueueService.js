import mongoose from 'mongoose';

/**
 * Enqueue jobs for the worker by inserting directly into the Agenda jobs collection.
 * This avoids adding Agenda as an API dependency — the worker picks up these jobs automatically.
 */
export class JobQueueService {
  static async enqueue(jobName, data = {}) {
    const collection = mongoose.connection.collection('agendaJobs');
    await collection.insertOne({
      name: jobName,
      data,
      type: 'normal',
      priority: 0,
      nextRunAt: new Date(),
      lastModifiedBy: null,
      lockedAt: null,
      lastRunAt: null,
      lastFinishedAt: null,
    });
  }
}
