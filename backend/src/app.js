const express = require('express');
const cors = require('cors');
const { initializeDB } = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const subjectRoutes = require('./routes/subject.routes');
const teacherRoutes = require('./routes/teacher.routes');
const classroomRoutes = require('./routes/classroom.routes');
const timetableRoutes = require('./routes/timetable.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const availabilityRoutes = require('./routes/teacherAvailability.routes');
const absenceRoutes = require('./routes/absence.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

app.use(cors());
app.use(express.json());

initializeDB();

app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/absence', absenceRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (_req, res) => {
    res.json({ message: 'Welcome to LUMOGEN API' });
});

module.exports = app;
