const Query = require('../models/Query');
const { AppError } = require('../middleware/errorHandler');
const { searchSimilar, getSuggestions } = require('../services/searchService');

exports.createQuery = async (req, res, next) => {
  try {
    const { question, category, description, isAnonymous, notifyOnResponse } = req.body;
    if (!question || !question.trim()) {
      return next(new AppError('Question is required', 400));
    }

    const query = await Query.create({
      user: req.user._id,
      question: question.trim(),
      category: (category || 'general').toLowerCase(),
      description: description || '',
      isAnonymous: !!isAnonymous,
      notifyOnResponse: !!notifyOnResponse,
    });

    res.status(201).json({ success: true, query });
  } catch (err) {
    next(err);
  }
};

exports.getMyQueries = async (req, res, next) => {
  try {
    const queries = await Query.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: queries.length, queries });
  } catch (err) {
    next(err);
  }
};

exports.getAllQueries = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [queries, total] = await Promise.all([
      Query.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Query.countDocuments(filter),
    ]);

    const mapped = queries.map(q => {
      const obj = q.toObject();
      if (q.isAnonymous) {
        obj.user = { name: 'Anonymous', email: '' };
      }
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
    if (!query) {
      return next(new AppError('Query not found', 404));
    }

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
    if (!query) {
      return next(new AppError('Query not found', 404));
    }

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
