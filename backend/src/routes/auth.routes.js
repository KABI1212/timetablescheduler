const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.post('/register', authenticate, requireRole(['admin']), authController.register);
router.post('/login', authController.login);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authenticate, authController.getMe);
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;
