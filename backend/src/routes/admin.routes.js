const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.get('/backups', authenticate, requireRole(['admin']), adminController.listBackups);
router.post('/backup', authenticate, requireRole(['admin']), adminController.backupDatabase);
router.post('/restore', authenticate, requireRole(['admin']), adminController.restoreDatabase);

module.exports = router;
