const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetable.controller');
const { authenticate, authenticateSse, requireRole } = require('../middleware/auth.middleware');

router.post('/generate', authenticate, requireRole(['admin']), timetableController.generateTimetable);
router.get('/generate/progress', authenticateSse, requireRole(['admin']), timetableController.streamProgress);
router.get('/', authenticate, timetableController.getTimetable);
router.get('/working', authenticate, requireRole(['admin']), timetableController.getWorkingTimetable);
router.get('/status', authenticate, requireRole(['admin']), timetableController.getTimetableStatus);
router.get('/options', authenticate, requireRole(['admin']), timetableController.getTimetableOptions);
router.get('/history', authenticate, requireRole(['admin']), timetableController.getTimetableHistory);
router.post('/options/:optionId/select', authenticate, requireRole(['admin']), timetableController.selectTimetableOption);
router.post('/history/:versionId/rollback', authenticate, requireRole(['admin']), timetableController.rollbackTimetableVersion);
router.post('/publish', authenticate, requireRole(['admin']), timetableController.publishTimetable);
router.get('/student/:classId', authenticate, timetableController.getStudentTimetable);
router.get('/conflicts', authenticate, requireRole(['admin']), timetableController.getConflicts);
router.post('/conflicts/fix', authenticate, requireRole(['admin']), timetableController.fixConflict);
router.post('/validate-swap', authenticate, requireRole(['admin']), timetableController.validateSwap);
router.post('/save-layout', authenticate, requireRole(['admin']), timetableController.saveLayout);
router.post('/reset', authenticate, requireRole(['admin']), timetableController.resetTimetable);

module.exports = router;
