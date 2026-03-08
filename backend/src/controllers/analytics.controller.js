const db = require('../config/db');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getAnalytics = async (req, res) => {
    try {
        // Teacher utilization
        const teacherStats = await db.query(`
            SELECT u.name, COUNT(t.id) as classes_count
            FROM teachers tr
            JOIN users u ON tr.user_id = u.id
            LEFT JOIN timetable t ON t.teacher_id = tr.id
            GROUP BY u.name
        `);

        // Classroom utilization
        const classroomStats = await db.query(`
            SELECT c.name, COUNT(t.id) as classes_count
            FROM classrooms c
            LEFT JOIN timetable t ON t.classroom_id = c.id
            GROUP BY c.name
        `);

        // Total entities
        /** @type {{ rows: { count: number }[] }} */
        const totalTeachers = await db.query('SELECT COUNT(*) FROM teachers');
        /** @type {{ rows: { count: number }[] }} */
        const totalClassrooms = await db.query('SELECT COUNT(*) FROM classrooms');
        /** @type {{ rows: { count: number }[] }} */
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
