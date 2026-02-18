import { EventModel } from '../config/eventSchema.js';

export async function getEvents(req, res, next) {
  try {
    const { type, severity, unread, page = 1, limit = 50 } = req.query;

    const query = { userId: req.user._id };
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (unread === 'true') query.isRead = false;

    const events = await EventModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await EventModel.countDocuments(query);

    res.json({
      events: events.map(e => e.toClient()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getEvent(req, res, next) {
  try {
    const event = await EventModel.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!event) {
      return res.status(404).json({
        error: { message: 'Event not found', code: 'NOT_FOUND' }
      });
    }

    res.json({ event: event.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req, res, next) {
  try {
    const event = await EventModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({
        error: { message: 'Event not found', code: 'NOT_FOUND' }
      });
    }

    res.json({ event: event.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function getWeeklySummary(req, res, next) {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const events = await EventModel.find({
      userId: req.user._id,
      createdAt: { $gte: oneWeekAgo }
    }).sort({ createdAt: -1 });

    const summary = {
      period: {
        from: oneWeekAgo,
        to: new Date()
      },
      totalEvents: events.length,
      byType: {},
      bySeverity: {},
      priceDrops: [],
      priceIncreases: [],
      alertEvents: []
    };

    for (const event of events) {
      summary.byType[event.type] = (summary.byType[event.type] || 0) + 1;
      summary.bySeverity[event.severity] = (summary.bySeverity[event.severity] || 0) + 1;

      if (event.type === 'price_drop') {
        summary.priceDrops.push(event.toClient());
      } else if (event.type === 'price_increase') {
        summary.priceIncreases.push(event.toClient());
      }

      if (event.severity === 'alert' || event.severity === 'critical') {
        summary.alertEvents.push(event.toClient());
      }
    }

    res.json(summary);
  } catch (error) {
    next(error);
  }
}
