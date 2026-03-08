const db = require('../config/db');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getAllClassrooms = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM classrooms');
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
exports.addClassroom = async (req, res) => {
    try {
        const { name, capacity, type } = req.body;
        const result = await db.query(
            'INSERT INTO classrooms (name, capacity, type) VALUES ($1, $2, $3) RETURNING *',
            [name, capacity, type || 'lecture']
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
exports.deleteClassroom = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM classrooms WHERE id = $1', [id]);
        res.json({ message: 'Classroom decommissioned' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
