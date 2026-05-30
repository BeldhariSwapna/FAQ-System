const Query = require('../models/Query');
const Faq = require('../models/Faq');
const { AppError } = require('../middleware/errorHandler');
const { searchSimilar } = require('../services/searchService');

exports.createQuery = async (req, res, next) => {
  try {
    const { question, category, description, isAnonymous, notifyOnResponse, tags, isUrgent } = req.body;
    if (!question || !question.trim()) {
      return next(new AppError('Question is required', 400));
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayCount = await Query.countDocuments({
      user: req.user._id,
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });

    if (todayCount >= 3) {
      return next(new AppError('You can only submit 3 questions per day. Please try again tomorrow.', 429));
    }

    const query = await Query.create({
      user: req.user._id,
      question: question.trim(),
      category: (category || 'general').toLowerCase(),
      description: description || '',
      isAnonymous: !!isAnonymous,
      notifyOnResponse: !!notifyOnResponse,
      tags: Array.isArray(tags) ? tags : [],
      isUrgent: !!isUrgent,
    });

    res.status(201).json({ success: true, query });
  } catch (err) {
    next(err);
  }
};

exports.getMyQueries = async (req, res, next) => {
  try {
    const queries = await Query.find({ user: req.user._id })
      .populate('answeredBy', 'name')
      .sort({ createdAt: -1 });

    const mapped = queries.map(q => {
      const obj = q.toObject();
      if (q.isAnonymous) obj.user = { name: 'Anonymous', email: '' };
      return obj;
    });

    res.json({ success: true, count: mapped.length, queries: mapped });
  } catch (err) {
    next(err);
  }
};

exports.getQueue = async (req, res, next) => {
  try {
    const { filter, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const now = new Date();

    let sort = { createdAt: -1 };
    let match = {};

    switch (filter) {
      case 'trending':
        match = { status: { $ne: 'closed' } };
        sort = { views: -1, upvotes: -1 };
        break;
      case 'oldest':
        match = { status: { $in: ['open', 'in_progress'] } };
        sort = { createdAt: 1 };
        break;
      case 'high-priority':
        match = { $or: [{ isUrgent: true }, { escalated: true }], status: { $ne: 'closed' } };
        sort = { escalatedAt: -1, createdAt: -1 };
        break;
      case 'answered':
        match = { status: 'resolved', adminResponse: { $ne: '' } };
        sort = { resolvedAt: -1 };
        break;
      case 'unanswered':
        match = { status: { $in: ['open', 'in_progress'] }, adminResponse: { $in: ['', null] } };
        sort = { createdAt: -1 };
        break;
      case 'my':
        match = { user: req.user._id };
        sort = { createdAt: -1 };
        break;
      case 'needs-admin':
        match = { escalated: true, status: { $ne: 'resolved' } };
        sort = { escalatedAt: -1 };
        break;
      default:
        match = { status: { $ne: 'closed' } };
        sort = { createdAt: -1 };
        break;
    }

    const [queries, total] = await Promise.all([
      Query.find(match)
        .populate('user', 'name email')
        .populate('answeredBy', 'name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Query.countDocuments(match),
    ]);

    const mapped = queries.map(q => {
      const obj = q.toObject();
      if (q.isAnonymous) obj.user = { name: 'Anonymous', email: '' };
      return obj;
    });

    res.json({
      success: true,
      count: mapped.length,
      queries: mapped,
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

exports.upvoteQuery = async (req, res, next) => {
  try {
    const query = await Query.findById(req.params.id);
    if (!query) return next(new AppError('Query not found', 404));

    const userId = req.user._id;
    const idx = query.upvotes.indexOf(userId);

    if (idx > -1) {
      query.upvotes.pull(userId);
    } else {
      query.upvotes.push(userId);
    }

    await query.save();
    res.json({ success: true, upvotes: query.upvotes.length, upvoted: idx === -1 });
  } catch (err) {
    next(err);
  }
};

exports.viewQuery = async (req, res, next) => {
  try {
    const query = await Query.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!query) return next(new AppError('Query not found', 404));
    res.json({ success: true, views: query.views });
  } catch (err) {
    next(err);
  }
};

exports.updateTags = async (req, res, next) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) return next(new AppError('Tags must be an array', 400));

    const query = await Query.findByIdAndUpdate(
      req.params.id,
      { tags },
      { new: true }
    );
    if (!query) return next(new AppError('Query not found', 404));
    res.json({ success: true, tags: query.tags });
  } catch (err) {
    next(err);
  }
};

exports.escalateQuery = async (req, res, next) => {
  try {
    const query = await Query.findById(req.params.id);
    if (!query) return next(new AppError('Query not found', 404));

    query.escalated = true;
    query.escalatedAt = new Date();
    await query.save();

    res.json({ success: true, query });
  } catch (err) {
    next(err);
  }
};

exports.answerQuery = async (req, res, next) => {
  try {
    const { response } = req.body;
    if (!response || !response.trim()) return next(new AppError('Response is required', 400));

    const query = await Query.findById(req.params.id);
    if (!query) return next(new AppError('Query not found', 404));

    query.adminResponse = response.trim();
    query.answeredBy = req.user._id;
    query.status = 'resolved';
    query.resolvedAt = new Date();
    await query.save();

    res.json({ success: true, query });
  } catch (err) {
    next(err);
  }
};

exports.checkDuplicates = async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question || question.trim().length < 3) {
      return res.json({ success: true, duplicates: [] });
    }

    const similarFaqs = await searchSimilar(question, 5);

    const existingQueries = await Query.find({
      question: { $regex: question.trim().split(' ').filter(w => w.length > 3).join('|'), $options: 'i' },
      status: { $ne: 'closed' },
    }).select('question category status createdAt').limit(5);

    const duplicates = [
      ...similarFaqs.filter(f => f.score > 0.6).map(f => ({
        type: 'faq',
        question: f.question,
        category: f.category,
        score: f.score,
      })),
      ...existingQueries.map(q => ({
        type: 'existing_query',
        question: q.question,
        category: q.category,
        status: q.status,
      })),
    ];

    res.json({ success: true, duplicates });
  } catch (err) {
    next(err);
  }
};

exports.suggestCategory = async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question || question.trim().length < 3) {
      return res.json({ success: true, category: 'general' });
    }

    const similar = await searchSimilar(question, 3);
    if (similar.length > 0 && similar[0].score > 0.5) {
      return res.json({ success: true, category: similar[0].category || 'general', confidence: similar[0].score });
    }

    res.json({ success: true, category: 'general', confidence: 0 });
  } catch (err) {
    next(err);
  }
};

exports.resolveQuery = async (req, res, next) => {
  try {
    const query = await Query.findById(req.params.id);
    if (!query) return next(new AppError('Query not found', 404));

    query.status = 'resolved';
    query.resolvedAt = new Date();
    await query.save();

    res.json({ success: true, query });
  } catch (err) {
    next(err);
  }
};

exports.respondToQuery = async (req, res, next) => {
  try {
    const { response, status } = req.body;
    const query = await Query.findById(req.params.id);
    if (!query) return next(new AppError('Query not found', 404));

    if (response) query.adminResponse = response;
    if (status) {
      query.status = status;
      if (status === 'resolved') query.resolvedAt = new Date();
    }
    await query.save();

    res.json({ success: true, query });
  } catch (err) {
    next(err);
  }
};

exports.getAdminInsights = async (req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const allQueries = await Query.find().populate('user', 'name email').lean();
    const queriesThisWeek = await Query.find({ createdAt: { $gte: sevenDaysAgo } }).populate('user', 'name email').lean();

    const tagCounts = {};
    const categoryCounts = {};
    const faqFailCounts = {};
    let totalQueriesWithCategory = 0;

    for (const q of allQueries) {
      const cat = q.category || 'general';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      totalQueriesWithCategory++;

      for (const tag of (q.tags || [])) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }

      const words = q.question.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      for (const w of words) {
        faqFailCounts[w] = (faqFailCounts[w] || 0) + 1;
      }
    }

    const topicClusters = Object.entries(categoryCounts)
      .map(([topic, count]) => ({ topic, count, percentage: Math.round((count / Math.max(totalQueriesWithCategory, 1)) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const allFaqs = await Faq.find({ isPublished: true }).select('question category views').lean();
    const faqQuestionWords = {};
    for (const faq of allFaqs) {
      const words = faq.question.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      for (const w of words) faqQuestionWords[w] = true;
    }

    const repeatedWords = Object.entries(faqFailCounts)
      .filter(([word]) => faqQuestionWords[word])
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const userQueryCounts = {};
    for (const q of queriesThisWeek) {
      const uid = q.user?._id?.toString() || 'unknown';
      userQueryCounts[uid] = userQueryCounts[uid] || { count: 0, name: q.isAnonymous ? 'Anonymous' : q.user?.name || 'Unknown', email: q.user?.email || '' };
      userQueryCounts[uid].count++;
    }

    const activeUsers = Object.values(userQueryCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const openQueries = allQueries.filter(q => q.status === 'open' || q.status === 'in_progress');
    const queryTitleWords = {};
    for (const q of openQueries) {
      const words = q.question.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      for (const w of words) queryTitleWords[w] = (queryTitleWords[w] || 0) + 1;
    }

    const uncoveredWords = Object.entries(queryTitleWords)
      .filter(([word]) => !faqQuestionWords[word])
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      success: true,
      insights: {
        topicClusters,
        failingFaqs: repeatedWords,
        activeUsers,
        knowledgeGaps: uncoveredWords,
        totals: {
          totalQueries: allQueries.length,
          openQueries: allQueries.filter(q => q.status === 'open').length,
          resolvedQueries: allQueries.filter(q => q.status === 'resolved').length,
          escalatedQueries: allQueries.filter(q => q.escalated).length,
          queriesThisWeek: queriesThisWeek.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.runEscalation = async () => {
  try {
    const hours = parseInt(process.env.ESCALATION_HOURS, 10) || 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const result = await Query.updateMany(
      {
        status: { $in: ['open', 'in_progress'] },
        escalated: false,
        createdAt: { $lte: cutoff },
      },
      {
        $set: { escalated: true, escalatedAt: new Date() },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Escalation: Auto-escalated ${result.modifiedCount} unanswered queries (${hours}h threshold)`);
    }
  } catch (err) {
    console.error('Escalation cron error:', err.message);
  }
};
