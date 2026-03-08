const db = require('../config/db');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getAllTeachers = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT t.id, u.name, u.email, t.max_hours_per_week 
            FROM teachers t
            JOIN users u ON t.user_id = u.id
        `);
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
exports.addTeacher = async (req, res) => {
    try {
        const { user_id, max_hours_per_week } = req.body;
        const result = await db.query(
            'INSERT INTO teachers (user_id, max_hours_per_week) VALUES ($1, $2) RETURNING *',
            [user_id, max_hours_per_week || 20]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.deleteTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM teachers WHERE id = $1', [id]);
        res.json({ message: 'Teacher removed from system' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
