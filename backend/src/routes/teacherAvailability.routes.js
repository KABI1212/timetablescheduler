const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/teacherAvailability.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.get('/', authenticate, requireRole(['admin']), availabilityController.getAvailability);
router.post('/', authenticate, requireRole(['admin']), availabilityController.updateAvailability);
router.get('/summary', authenticate, requireRole(['admin']), availabilityController.getAvailabilitySummary);
router.post('/leave', authenticate, requireRole(['admin']), availabilityController.submitLeaveRequest);
router.get('/leave', authenticate, requireRole(['admin']), availabilityController.getLeaveRequests);
router.post('/leave/:id', authenticate, requireRole(['admin']), availabilityController.updateLeaveStatus);

module.exports = router;
