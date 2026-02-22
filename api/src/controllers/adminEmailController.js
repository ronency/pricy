import { EmailModel } from '@pricy/shared/db';

export async function listEmails(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.userId) filter.userId = req.query.userId;

    const [emails, total] = await Promise.all([
      EmailModel.find(filter)
        .select('-html')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailModel.countDocuments(filter)
    ]);

    res.json({
      emails: emails.map(e => ({
        id: e._id,
        to: e.to,
        from: e.from,
        subject: e.subject,
        type: e.type,
        userId: e.userId,
        status: e.status,
        sentAt: e.sentAt,
        createdAt: e.createdAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmail(req, res, next) {
  try {
    const email = await EmailModel.findById(req.params.id);

    if (!email) {
      return res.status(404).json({
        error: { message: 'Email not found', code: 'NOT_FOUND' }
      });
    }

    res.json({ email: email.toClient() });
  } catch (error) {
    next(error);
  }
}
