const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', authenticate, notificationController.getNotifications);
router.post('/read-all', authenticate, notificationController.markAllRead);

module.exports = router;
