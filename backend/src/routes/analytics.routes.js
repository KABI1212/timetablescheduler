const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.get('/', authenticate, requireRole(['admin']), analyticsController.getAnalytics);
router.get('/teacher-workload', authenticate, requireRole(['admin']), analyticsController.getTeacherWorkload);
router.get('/room-utilization', authenticate, requireRole(['admin']), analyticsController.getRoomUtilization);
router.get('/weekly-heatmap', authenticate, requireRole(['admin']), analyticsController.getWeeklyHeatmap);
router.get('/subject-distribution', authenticate, requireRole(['admin']), analyticsController.getSubjectDistribution);
router.get('/audit-trail', authenticate, requireRole(['admin']), analyticsController.getAuditTrail);

module.exports = router;
