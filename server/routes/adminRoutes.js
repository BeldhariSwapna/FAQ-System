const { Router } = require('express');
const adminController = require('../controllers/adminController');
const { authenticateUser, authorizeRoles } = require('../middleware/auth');

const router = Router();

router.use(authenticateUser, authorizeRoles('super_admin', 'admin'));

router.get('/insights', adminController.getInsights);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/role', authorizeRoles('super_admin', 'admin'), adminController.updateUserRole);
router.patch('/users/:id/promote', authorizeRoles('super_admin', 'admin'), adminController.promoteToAdmin);
router.delete('/users/:id', authorizeRoles('super_admin'), adminController.deleteUser);

module.exports = router;
