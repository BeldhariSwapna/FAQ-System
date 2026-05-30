const { Router } = require('express');
const queryController = require('../controllers/queryController');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

const router = Router();

router.post('/', authenticateUser, queryController.createQuery);
router.get('/me', authenticateUser, queryController.getMyQueries);
router.get('/all', authenticateUser, queryController.getAllQueries);

router.get('/', authenticateUser, authorizeRoles('admin', 'super_admin'), queryController.getAllQueries);
router.put('/:id', authenticateUser, authorizeRoles('admin', 'super_admin'), queryController.respondToQuery);
router.patch('/:id/resolve', authenticateUser, queryController.resolveQuery);

module.exports = router;
