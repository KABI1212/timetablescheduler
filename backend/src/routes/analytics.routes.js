const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', authenticate, analyticsController.getAnalytics);

module.exports = router;
