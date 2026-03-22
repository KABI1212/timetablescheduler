const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subject.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.get('/', authenticate, subjectController.getAllSubjects);
router.post('/', authenticate, requireRole(['admin']), subjectController.addSubject);
router.delete('/:id', authenticate, requireRole(['admin']), subjectController.deleteSubject);
router.put('/:id', authenticate, requireRole(['admin']), subjectController.updateSubject);

module.exports = router;
