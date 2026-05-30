const User = require('../models/User');
const Query = require('../models/Query');
const Faq = require('../models/Faq');
const Query = require('../models/Query');
const Faq = require('../models/Faq');
const { AppError } = require('../middleware/errorHandler');

exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = {};

    if (role && ['super_admin', 'admin', 'intern'].includes(role)) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-refreshToken -passwordResetToken -passwordResetExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-refreshToken -passwordResetToken -passwordResetExpires');
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role || !['super_admin', 'admin', 'intern'].includes(role)) {
      return next(new AppError('Valid role is required (super_admin, admin, intern)', 400));
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return next(new AppError('Only super admins can modify super admin accounts', 403));
    }

    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return next(new AppError('Only super admins can assign super admin role', 403));
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.promoteToAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.role !== 'intern') {
      return next(new AppError('Only interns can be promoted to admin', 400));
    }

    user.role = 'admin';
    await user.save();

    res.json({
      success: true,
      message: 'Intern promoted to admin successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.role === 'super_admin') {
      return next(new AppError('Cannot delete a super admin account', 403));
    }

    if (user._id.equals(req.user._id)) {
      return next(new AppError('Cannot delete your own account', 400));
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getInsights = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const allFaqs = await Faq.find({ isPublished: true }).select('question category views').lean();
    const faqWordSet = new Set();
    for (const faq of allFaqs) {
      for (const w of faq.question.toLowerCase().split(/\s+/).filter(w => w.length > 4)) {
        faqWordSet.add(w);
      }
    }

    const allQueries = await Query.find({ status: { $ne: 'closed' } }).populate('user', 'name email').lean();
    const queriesThisWeek = await Query.find({ createdAt: { $gte: sevenDaysAgo } }).populate('user', 'name email').lean();

    const categoryCounts = {};
    const tagCounts = {};
    const userCounts = {};
    const queryWordCounts = {};

    for (const q of allQueries) {
      const cat = q.category || 'general';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      for (const tag of (q.tags || [])) tagCounts[tag] = (tagCounts[tag] || 0) + 1;

      for (const w of q.question.toLowerCase().split(/\s+/).filter(w => w.length > 4)) {
        queryWordCounts[w] = (queryWordCounts[w] || 0) + 1;
      }
    }

    for (const q of queriesThisWeek) {
      const uid = q.user?._id?.toString() || 'unknown';
      if (!userCounts[uid]) {
        userCounts[uid] = { count: 0, name: q.isAnonymous ? 'Anonymous' : q.user?.name || 'Unknown' };
      }
      userCounts[uid].count++;
    }

    const topicClusters = Object.entries(categoryCounts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const failingFaqs = Object.entries(queryWordCounts)
      .filter(([word]) => faqWordSet.has(word))
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const knowledgeGaps = Object.entries(queryWordCounts)
      .filter(([word]) => !faqWordSet.has(word))
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const activeUsers = Object.values(userCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      success: true,
      insights: {
        topicClusters,
        failingFaqs,
        activeUsers,
        knowledgeGaps,
        totals: {
          totalFaqs: allFaqs.length,
          totalOpenQueries: allQueries.length,
          queriesThisWeek: queriesThisWeek.length,
          escalatedQueries: allQueries.filter(q => q.escalated).length,
          unresolvedQueries: allQueries.filter(q => q.status === 'open' || q.status === 'in_progress').length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
