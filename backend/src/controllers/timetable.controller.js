const db = require('../config/db');
const TimetableScheduler = require('../services/aiScheduling.service');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.generateTimetable = async (req, res) => {
    try {
        await db.query('DELETE FROM timetable');

        const classroomsDb = await db.query('SELECT * FROM classrooms');
        const subjectsDb = await db.query('SELECT * FROM subjects');

        const teacherMappings = await db.query(`
            SELECT ts.teacher_id as id, ts.subject_id 
            FROM teacher_subjects ts
        `);

        if (classroomsDb.rows.length === 0 || subjectsDb.rows.length === 0 || teacherMappings.rows.length === 0) {
            return res.status(400).json({ error: 'Incomplete data to generate timetable. Ensure teachers, subjects, and classrooms exist.' });
        }

        const scheduler = new TimetableScheduler(
            teacherMappings.rows,
            subjectsDb.rows,
            classroomsDb.rows
        );

        const bestSchedule = await scheduler.run();

        for (const entry of bestSchedule) {
            await db.query(
                'INSERT INTO timetable (subject_id, teacher_id, classroom_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4, $5, $6)',
                [entry.subject_id, entry.teacher_id, entry.classroom_id, entry.day_of_week, entry.start_time, entry.end_time]
            );
        }

        res.json({ message: 'Timetable generated successfully via AI', data: bestSchedule });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during timetable generation' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getTimetable = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.id, t.day_of_week, t.start_time, t.end_time,
                   s.name as subject_name,
                   u.name as teacher_name,
                   c.name as classroom_name
            FROM timetable t
            JOIN subjects s ON t.subject_id = s.id
            JOIN teachers tr ON t.teacher_id = tr.id
            JOIN users u ON tr.user_id = u.id
            JOIN classrooms c ON t.classroom_id = c.id
            ORDER BY case day_of_week 
                when 'Monday' then 1
                when 'Tuesday' then 2
                when 'Wednesday' then 3
                when 'Thursday' then 4
                when 'Friday' then 5
                when 'Saturday' then 6
                end, t.start_time
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
