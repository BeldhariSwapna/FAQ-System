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
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    adminResponse: {
      type: String,
      default: '',
    },
    resolvedAt: Date,
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
querySchema.index({ status: 1 });

module.exports = mongoose.model('Query', querySchema);
