const db = require('../config/db');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getAnalytics = async (_req, res) => {
    try {
        const teacherStats = await db.query(`
            SELECT u.name, COUNT(t.id) as classes_count
            FROM teachers tr
            JOIN users u ON tr.user_id = u.id
            LEFT JOIN timetable t ON t.teacher_id = tr.id
            GROUP BY u.name
        `);

        const classroomStats = await db.query(`
            SELECT c.name, COUNT(t.id) as classes_count
            FROM classrooms c
            LEFT JOIN timetable t ON t.classroom_id = c.id
            GROUP BY c.name
        `);

        const totalTeachers = await db.query('SELECT COUNT(*) FROM teachers');
        const totalClassrooms = await db.query('SELECT COUNT(*) FROM classrooms');
        const totalSubjects = await db.query('SELECT COUNT(*) FROM subjects');

        res.json({
            teacherUtilization: teacherStats.rows,
            classroomUtilization: classroomStats.rows,
            overview: {
                teachers: Number(totalTeachers.rows[0]?.['count'] ?? 0),
                classrooms: Number(totalClassrooms.rows[0]?.['count'] ?? 0),
                subjects: Number(totalSubjects.rows[0]?.['count'] ?? 0)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching analytics' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getTeacherWorkload = async (_req, res) => {
    try {
        const { rows: teachers } = await db.query('SELECT * FROM teachers');
        const { rows: users } = await db.query('SELECT * FROM users');
        const timetable = db.getTimetableData();
        const data = teachers.map((teacher) => {
            const user = users.find((u) => u.id == teacher.user_id);
            const periods = timetable.filter((t) => t.teacher_id == teacher.id).length;
            return {
                teacher: user?.name || 'Unknown',
                periods
            };
        });
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getRoomUtilization = async (_req, res) => {
    try {
        const { rows: classrooms } = await db.query('SELECT * FROM classrooms');
        const timetable = db.getTimetableData();
        const totalSlots = 6 * 8;
        const data = classrooms.map((room) => {
            const occupied = timetable.filter((t) => t.classroom_id == room.id).length;
            return {
                room: room.name,
                occupied,
                total: totalSlots,
                percent: totalSlots ? Math.round((occupied / totalSlots) * 100) : 0
            };
        });
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getWeeklyHeatmap = async (_req, res) => {
    try {
        const timetable = db.getTimetableData();
        const dayIndex = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5 };
        const slotIndex = {
            '09:15:00': 0,
            '10:00:00': 1,
            '11:00:00': 2,
            '11:45:00': 3,
            '13:20:00': 4,
            '14:05:00': 5,
            '15:05:00': 6,
            '15:55:00': 7
        };
        const counts = {};
        timetable.forEach((entry) => {
            const d = dayIndex[entry.day_of_week];
            const s = slotIndex[entry.start_time];
            if (d === undefined || s === undefined) return;
            const key = `${d}-${s}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        const data = Object.keys(counts).map((key) => {
            const [d, s] = key.split('-').map(Number);
            return { dayIndex: d, slotIndex: s, count: counts[key] };
        });
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getSubjectDistribution = async (_req, res) => {
    try {
        const { rows: subjects } = await db.query('SELECT * FROM subjects');
        const timetable = db.getTimetableData();
        const data = subjects.map((subject) => {
            const periods = timetable.filter((t) => t.subject_id == subject.id).length;
            return {
                subject: subject.name,
                periods
            };
        });
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
exports.getAuditTrail = async (_req, res) => {
    try {
        const logs = db.getAuditLogs().slice(0, 30);
        const { rows: users } = await db.query('SELECT * FROM users');
        const userById = new Map(users.map((user) => [Number(user.id), user]));

        const data = logs.map((log) => ({
            ...log,
            actor_name: log.actor_id ? (userById.get(Number(log.actor_id))?.name || 'Unknown') : 'System'
        }));
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
