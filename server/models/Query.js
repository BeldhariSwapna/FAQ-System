const mongoose = require('mongoose');

const querySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'general',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    adminResponse: {
      type: String,
      default: '',
    },
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    answerAccepted: {
      type: Boolean,
      default: false,
    },
    resolvedAt: Date,
    isUrgent: {
      type: Boolean,
      default: false,
    },
    escalated: {
      type: Boolean,
      default: false,
    },
    escalatedAt: Date,
    views: {
      type: Number,
      default: 0,
    },
    upvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    notifyOnResponse: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

querySchema.index({ user: 1, createdAt: -1 });
querySchema.index({ status: 1, createdAt: -1 });
querySchema.index({ status: 1, escalated: 1 });
querySchema.index({ status: 1, views: -1 });
querySchema.index({ tags: 1 });

module.exports = mongoose.model('Query', querySchema);
