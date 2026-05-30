const { Router } = require('express');
const queryController = require('../controllers/queryController');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

const router = Router();

router.post('/', authenticateUser, queryController.createQuery);
router.get('/me', authenticateUser, queryController.getMyQueries);
router.get('/queue', authenticateUser, queryController.getQueue);
router.get('/all', authenticateUser, queryController.getAllQueries);
router.post('/check-duplicate', authenticateUser, queryController.checkDuplicates);
router.post('/suggest-category', authenticateUser, queryController.suggestCategory);
router.post('/:id/upvote', authenticateUser, queryController.upvoteQuery);
router.post('/:id/view', authenticateUser, queryController.viewQuery);
router.put('/:id/tags', authenticateUser, queryController.updateTags);
router.post('/:id/escalate', authenticateUser, queryController.escalateQuery);

router.get('/', authenticateUser, authorizeRoles('admin', 'super_admin'), queryController.getAllQueries);
router.put('/:id', authenticateUser, authorizeRoles('admin', 'super_admin'), queryController.respondToQuery);
router.post('/:id/answer', authenticateUser, authorizeRoles('admin', 'super_admin'), queryController.answerQuery);
router.patch('/:id/resolve', authenticateUser, queryController.resolveQuery);

module.exports = router;
