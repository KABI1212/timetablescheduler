const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initializeDB } = require('./src/config/db');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const subjectRoutes = require('./src/routes/subject.routes');
const teacherRoutes = require('./src/routes/teacher.routes');
const classroomRoutes = require('./src/routes/classroom.routes');
const timetableRoutes = require('./src/routes/timetable.routes');
const analyticsRoutes = require('./src/routes/analytics.routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Postgres Schema
initializeDB();

// Setup Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to ChronoClass AI API' });
});

app.listen(PORT, () => {
    console.log(`ChronoClass Server running on port ${PORT}`);
});
