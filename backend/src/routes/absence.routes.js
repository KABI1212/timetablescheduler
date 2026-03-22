const express = require('express');
const router = express.Router();
const absenceController = require('../controllers/absence.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.get('/', authenticate, requireRole(['admin']), absenceController.getAbsences);
router.post('/', authenticate, requireRole(['admin']), absenceController.markAbsent);
router.post('/:id/assign', authenticate, requireRole(['admin']), absenceController.assignSubstitute);

module.exports = router;
