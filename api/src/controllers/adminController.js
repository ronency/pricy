import { UserModel } from '../config/userSchema.js';
import { ProductModel } from '../config/productSchema.js';
import { CompetitorModel } from '../config/competitorSchema.js';
import { PlanLimits } from '@pricy/shared';

// ─── Dashboard Stats ───
export async function getDashboardStats(req, res, next) {
  try {
    const [
      totalUsers,
      activeUsers,
      totalProducts,
      totalCompetitors,
      planCounts
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ isActive: true }),
      ProductModel.countDocuments(),
      CompetitorModel.countDocuments(),
      UserModel.aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } }
      ])
    ]);

    const plans = {};
    for (const p of planCounts) {
      plans[p._id] = p.count;
    }

    res.json({
      users: { total: totalUsers, active: activeUsers },
      products: totalProducts,
      competitors: totalCompetitors,
      plans
    });
  } catch (error) {
    next(error);
  }
}

// ─── Users ───
export async function listUsers(req, res, next) {
  try {
    const { page = 1, limit = 25, search, plan, active } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    if (plan) query.plan = plan;
    if (active !== undefined) query.isActive = active === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      UserModel.countDocuments(query)
    ]);

    res.json({
      users: users.map(u => u.toClient()),
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    next(error);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found', code: 'NOT_FOUND' } });
    }

    const [productCount, competitorCount] = await Promise.all([
      ProductModel.countDocuments({ userId: user._id }),
      CompetitorModel.countDocuments({ userId: user._id })
    ]);

    res.json({ user: user.toClient(), productCount, competitorCount });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { plan, isActive, role } = req.body;
    const update = {};

    if (plan !== undefined) {
      update.plan = plan;
      update.planLimits = PlanLimits[plan] || PlanLimits.free;
    }
    if (isActive !== undefined) update.isActive = isActive;
    if (role !== undefined && ['user', 'admin'].includes(role)) update.role = role;

    const user = await UserModel.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found', code: 'NOT_FOUND' } });
    }

    res.json({ user: user.toClient() });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const user = await UserModel.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found', code: 'NOT_FOUND' } });
    }

    // Cascade delete user's data
    await Promise.all([
      ProductModel.deleteMany({ userId: user._id }),
      CompetitorModel.deleteMany({ userId: user._id })
    ]);

    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
}

// ─── Products (all users) ───
export async function listAllProducts(req, res, next) {
  try {
    const { page = 1, limit = 25, search, userId } = req.query;
    const query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (userId) query.userId = userId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      ProductModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('userId', 'name email'),
      ProductModel.countDocuments(query)
    ]);

    res.json({
      products: products.map(p => ({
        ...p.toClient(),
        ownerName: p.userId?.name,
        ownerEmail: p.userId?.email,
        userId: p.userId?._id
      })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    next(error);
  }
}

// ─── Competitors (all users) ───
export async function listAllCompetitors(req, res, next) {
  try {
    const { page = 1, limit = 25, search, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.checkStatus = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [competitors, total] = await Promise.all([
      CompetitorModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('userId', 'name email'),
      CompetitorModel.countDocuments(query)
    ]);

    res.json({
      competitors: competitors.map(c => ({
        ...c.toClient(),
        ownerName: c.userId?.name,
        ownerEmail: c.userId?.email,
        userId: c.userId?._id
      })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    next(error);
  }
}

// ─── Plan stats ───
export async function getPlanStats(req, res, next) {
  try {
    const pipeline = [
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          activeCount: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const planStats = await UserModel.aggregate(pipeline);

    const plans = ['free', 'starter', 'pro', 'advanced'].map(name => {
      const stat = planStats.find(p => p._id === name) || { count: 0, activeCount: 0 };
      return {
        name,
        limits: PlanLimits[name],
        totalUsers: stat.count,
        activeUsers: stat.activeCount
      };
    });

    res.json({ plans });
  } catch (error) {
    next(error);
  }
}
