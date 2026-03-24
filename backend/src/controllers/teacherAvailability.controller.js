const db = require('../config/db');
const VALID_AVAILABILITY_STATUSES = new Set(['preferred', 'blocked']);

/**
 * @param {import('express').Request & { user?: any }} req
 * @param {import('express').Response} res
 */
exports.getAvailability = async (req, res) => {
    try {
        const { rows: teachers } = await db.query('SELECT * FROM teachers');
        const teacher = teachers.find((t) => t.user_id == req.user?.id);
        if (!teacher) return res.json([]);
        const result = await db.query('SELECT * FROM teacher_availability WHERE teacher_id = $1', [teacher.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request & { user?: any }} req
 * @param {import('express').Response} res
 */
exports.updateAvailability = async (req, res) => {
    try {
        const { day_of_week, timeslot } = req.body;
        const status = req.body.status == null ? null : String(req.body.status).trim().toLowerCase();
        const { rows: teachers } = await db.query('SELECT * FROM teachers');
        const teacher = teachers.find((t) => t.user_id == req.user?.id);
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
        if (status !== null && !VALID_AVAILABILITY_STATUSES.has(status)) {
            return res.status(400).json({ error: 'Status must be preferred, blocked, or null.' });
        }

        if (status === null) {
            await db.query(
                'DELETE FROM teacher_availability WHERE teacher_id = $1 AND day_of_week = $2 AND timeslot = $3',
                [teacher.id, day_of_week, timeslot]
            );
            return res.json({ teacher_id: teacher.id, day_of_week, timeslot, status: null });
        }

        const result = await db.query(
            'INSERT INTO teacher_availability (teacher_id, day_of_week, timeslot, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [teacher.id, day_of_week, timeslot, status]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getAvailabilitySummary = async (_req, res) => {
    try {
        const result = await db.query('SELECT * FROM teacher_availability');
        const summary = [];
        result.rows.forEach((row) => {
            const key = `${row.day_of_week}-${row.timeslot}`;
            const existing = summary.find((s) => s.key === key);
            if (existing) {
                if (row.status === 'blocked') existing.blocked += 1;
                if (row.status === 'preferred') existing.preferred += 1;
            } else {
                summary.push({
                    key,
                    day_of_week: row.day_of_week,
                    timeslot: row.timeslot,
                    blocked: row.status === 'blocked' ? 1 : 0,
                    preferred: row.status === 'preferred' ? 1 : 0
                });
            }
        });
        res.json(summary);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request & { user?: any }} req
 * @param {import('express').Response} res
 */
exports.submitLeaveRequest = async (req, res) => {
    try {
        const { from_date, to_date, reason, type } = req.body;
        const { rows: teachers } = await db.query('SELECT * FROM teachers');
        const teacher = teachers.find((t) => t.user_id == req.user?.id);
        if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
        const result = await db.query(
            'INSERT INTO leave_requests (teacher_id, from_date, to_date, reason, type, status, admin_note, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [teacher.id, from_date, to_date, reason, type, 'Pending', '', new Date().toISOString()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request & { user?: any }} req
 * @param {import('express').Response} res
 */
exports.getLeaveRequests = async (req, res) => {
    try {
        if (req.user?.role === 'admin') {
            const result = await db.query('SELECT * FROM leave_requests');
            return res.json(result.rows);
        }
        const { rows: teachers } = await db.query('SELECT * FROM teachers');
        const teacher = teachers.find((t) => t.user_id == req.user?.id);
        if (!teacher) return res.json([]);
        const result = await db.query('SELECT * FROM leave_requests WHERE teacher_id = $1', [teacher.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_note } = req.body;
        const result = await db.query('UPDATE leave_requests SET status = $1, admin_note = $2 WHERE id = $3 RETURNING *', [status, admin_note, Number(id)]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
