const Query = require('../models/Query');
const { AppError } = require('../middleware/errorHandler');

exports.createQuery = async (req, res, next) => {
  try {
    const { question, category, description } = req.body;
    if (!question || !question.trim()) {
      return next(new AppError('Question is required', 400));
    }

    const query = await Query.create({
      user: req.user._id,
      question: question.trim(),
      category: (category || 'general').toLowerCase(),
      description: description || '',
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

    res.json({
      success: true,
      count: queries.length,
      queries,
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
