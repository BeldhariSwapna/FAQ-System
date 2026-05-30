const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const queryController = require('../controllers/queryController');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

const router = Router();

const queryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many queries. Please wait a minute before submitting another.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', authenticateUser, queryLimiter, queryController.createQuery);
router.get('/me', authenticateUser, queryController.getMyQueries);
router.get('/all', authenticateUser, queryController.getAllQueries);
router.post('/check-duplicate', authenticateUser, queryController.checkDuplicates);
router.post('/suggest-category', authenticateUser, queryController.suggestCategory);

router.get('/', authenticateUser, authorizeRoles('admin', 'super_admin'), queryController.getAllQueries);
router.put('/:id', authenticateUser, authorizeRoles('admin', 'super_admin'), queryController.respondToQuery);
router.patch('/:id/resolve', authenticateUser, queryController.resolveQuery);

module.exports = router;
