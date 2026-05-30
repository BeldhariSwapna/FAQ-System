require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const Faq = require('./models/Faq');
const { fetchFAQs } = require('./services/scraper');
const { INTERNSHIP_FAQS } = require('./services/internshipFaqs');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const faqRoutes = require('./routes/faqRoutes');
const queryRoutes = require('./routes/queryRoutes');
const internshipRoutes = require('./routes/internshipRoutes');
const searchRoutes = require('./routes/searchRoutes');
const { indexAllFaqs } = require('./services/searchService');
const { runEscalation } = require('./controllers/queryController');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/internship', internshipRoutes);
app.use('/api/search', searchRoutes);

app.all('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const INTERN_CATEGORIES = [
  'about-internship', 'timing-dates', 'noc', 'selection-offer',
  'work-mentorship', 'code-of-conduct', 'interviews', 'certificate',
  'rosetta', 'coursework-vibe', 'yaksha-chat', 'vibe-platform',
  'team-formation',
];

const seedFAQs = async () => {
  try {
    const oldCount = await Faq.countDocuments({ category: { $nin: INTERN_CATEGORIES } });
    if (oldCount > 0) {
      await Faq.deleteMany({ category: { $nin: INTERN_CATEGORIES } });
      console.log(`FAQs: Removed ${oldCount} old non-internship FAQs`);
    }

    const count = await Faq.countDocuments();
    if (count > 0) {
      console.log(`FAQs: ${count} internship FAQs already exist`);
      return;
    }

    const live = await fetchFAQs();
    if (live && live.length > 0) {
      await Faq.insertMany(live);
      console.log(`FAQs: Seeded ${live.length} FAQs from live source`);
      return;
    }

    await Faq.insertMany(INTERNSHIP_FAQS);
    console.log(`FAQs: Seeded ${INTERNSHIP_FAQS.length} FAQs from fallback`);
  } catch (err) {
    console.warn('FAQs: Seed skipped:', err.message);
  }
};

const startServer = async () => {
  try {
    await connectDB();
    await seedFAQs();
    indexAllFaqs().then(count => {
      if (count > 0) console.log(`Search: Indexed ${count} FAQs for semantic search`);
    }).catch(() => {});
    runEscalation();
    setInterval(runEscalation, 60 * 60 * 1000);

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();
