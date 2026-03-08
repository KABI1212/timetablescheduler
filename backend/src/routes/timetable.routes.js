const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetable.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.post('/generate', authenticate, requireRole(['admin']), timetableController.generateTimetable);
router.get('/', authenticate, timetableController.getTimetable);

module.exports = router;
