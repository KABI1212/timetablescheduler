const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroom.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

router.get('/', authenticate, classroomController.getAllClassrooms);
router.post('/', authenticate, requireRole(['admin']), classroomController.addClassroom);
router.delete('/:id', authenticate, requireRole(['admin']), classroomController.deleteClassroom);
router.put('/:id', authenticate, requireRole(['admin']), classroomController.updateClassroom);

module.exports = router;
