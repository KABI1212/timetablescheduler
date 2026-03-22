const db = require('../config/db');
const { findSubstitutes } = require('../services/substituteEngine.service');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getAbsences = async (_req, res) => {
    try {
        const { rows: absences } = await db.query('SELECT * FROM absence_records');
        const { rows: teachers } = await db.query('SELECT * FROM teachers');
        const { rows: users } = await db.query('SELECT * FROM users');
        const result = absences.map((record) => {
            const teacher = teachers.find((t) => t.id == record.teacher_id);
            const teacherUser = users.find((u) => u.id == teacher?.user_id);
            const subTeacher = teachers.find((t) => t.id == record.substitute_teacher_id);
            const subUser = users.find((u) => u.id == subTeacher?.user_id);
            return {
                ...record,
                teacher_name: teacherUser?.name || 'Unknown',
                substitute_teacher_name: subUser?.name || null
            };
        });
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.markAbsent = async (req, res) => {
    try {
        const { teacher_id, date, reason, subject_id, classroom_id, day_of_week, start_time, end_time } = req.body;
        const result = await db.query(
            'INSERT INTO absence_records (teacher_id, date, reason, substitute_teacher_id, day_of_week, start_time, end_time, subject_id, classroom_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [teacher_id, date, reason, null, day_of_week, start_time, end_time, subject_id, classroom_id]
        );
        const absence = result.rows[0];
        const suggestions = await findSubstitutes({
            subject_id,
            day_of_week,
            start_time,
            exclude_teacher_id: teacher_id
        });
        res.json({ absence, suggestions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.assignSubstitute = async (req, res) => {
    try {
        const { id } = req.params;
        const { substitute_teacher_id } = req.body;
        const { rows: absences } = await db.query('SELECT * FROM absence_records');
        const absence = absences.find((a) => a.id == id);
        if (!absence) return res.status(404).json({ error: 'Absence record not found' });

        await db.query('UPDATE absence_records SET substitute_teacher_id = $1 WHERE id = $2', [substitute_teacher_id, absence.id]);

        const timetable = db.getTimetableData();
        const target = timetable.find((t) =>
            t.teacher_id == absence.teacher_id &&
            t.day_of_week === absence.day_of_week &&
            t.start_time === absence.start_time
        );
        if (target) {
            target.substitute_teacher_id = substitute_teacher_id;
            db.replaceTimetable(timetable);
        }

        const { rows: teachers } = await db.query('SELECT * FROM teachers');
        const { rows: users } = await db.query('SELECT * FROM users');
        const subject = target ? (await db.query('SELECT * FROM subjects')).rows.find((s) => s.id == target.subject_id) : null;
        const classroom = target ? (await db.query('SELECT * FROM classrooms')).rows.find((c) => c.id == target.classroom_id) : null;

        const subTeacher = teachers.find((t) => t.id == substitute_teacher_id);
        const subUser = users.find((u) => u.id == subTeacher?.user_id);

        if (subUser) {
            await db.query(
                'INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [
                    subUser.id,
                    `You have been assigned as substitute for ${subject?.name || 'a class'} on ${absence.date} at ${absence.start_time} in ${classroom?.name || 'room'}`,
                    'substitute',
                    false,
                    new Date().toISOString()
                ]
            );
        }

        const students = users.filter((u) => u.role === 'student');
        for (const student of students) {
            await db.query(
                'INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [
                    student.id,
                    `Teacher changed for ${subject?.name || 'a class'} on ${absence.date}`,
                    'announcement',
                    false,
                    new Date().toISOString()
                ]
            );
        }

        res.json({ message: 'Substitute assigned' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
