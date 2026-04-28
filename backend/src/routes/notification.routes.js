const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.get('/', authenticate, requireRole(['admin']), notificationController.getNotifications);
router.post('/read-all', authenticate, requireRole(['admin']), notificationController.markAllRead);
router.put('/read-all', authenticate, requireRole(['admin']), notificationController.markAllRead);
router.put('/:id/read', authenticate, requireRole(['admin']), notificationController.markOneRead);
router.delete('/', authenticate, requireRole(['admin']), notificationController.clearAll);

module.exports = router;
