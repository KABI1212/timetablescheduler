const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.get('/', authenticate, teacherController.getAllTeachers);
router.post('/', authenticate, requireRole(['admin']), teacherController.addTeacher);
router.delete('/:id', authenticate, requireRole(['admin']), teacherController.deleteTeacher);
router.put('/:id', authenticate, requireRole(['admin']), teacherController.updateTeacher);

module.exports = router;
