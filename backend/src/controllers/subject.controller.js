const db = require('../config/db');

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getAllSubjects = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM subjects');
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
exports.addSubject = async (req, res) => {
    try {
        const { name, code, credits, is_lab, lab_duration, theory_hours, lab_hours } = req.body;
        const result = await db.query(
            'INSERT INTO subjects (name, code, credits, is_lab, lab_duration, theory_hours, lab_hours) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [
                name,
                code,
                credits || 3,
                Boolean(is_lab),
                lab_duration || (is_lab ? 2 : 1),
                Number.isFinite(theory_hours) ? theory_hours : 3,
                Boolean(is_lab) ? (Number.isFinite(lab_hours) ? Math.max(0, lab_hours) : (lab_duration || 2)) : 0
            ]
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
exports.deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM subjects WHERE id = $1', [id]);
        res.json({ message: 'Subject module purged' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, credits, is_lab, lab_duration, theory_hours, lab_hours } = req.body;
        const result = await db.query(
            'UPDATE subjects SET name = $1, code = $2, credits = $3, is_lab = $4, lab_duration = $5, theory_hours = $6, lab_hours = $7 WHERE id = $8 RETURNING *',
            [
                name,
                code,
                credits || 3,
                Boolean(is_lab),
                lab_duration || (is_lab ? 2 : 1),
                Number.isFinite(theory_hours) ? theory_hours : 3,
                Boolean(is_lab) ? (Number.isFinite(lab_hours) ? Math.max(0, lab_hours) : (lab_duration || 2)) : 0,
                id
            ]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Subject not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
