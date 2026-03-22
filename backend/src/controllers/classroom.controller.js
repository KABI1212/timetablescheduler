const db = require('../config/db');

const logClassroomAction = (req, action, summary, room) => {
    db.addAuditLog({
        action,
        entity_type: 'classroom',
        entity_id: room?.id || null,
        actor_id: req.user?.id || null,
        summary,
        metadata: room ? {
            name: room.name,
            capacity: room.capacity,
            type: room.type,
            maintenance_mode: Boolean(room.maintenance_mode)
        } : {}
    });
};

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
        const { name, capacity, type, is_lab, maintenance_mode, maintenance_note } = req.body;
        const result = await db.query(
            'INSERT INTO classrooms (name, capacity, type, is_lab, maintenance_mode, maintenance_note) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, capacity, type || 'lecture', Boolean(is_lab), Boolean(maintenance_mode), maintenance_note || '']
        );
        logClassroomAction(req, 'classroom.created', `Created classroom ${result.rows[0].name}.`, result.rows[0]);
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
        const { rows: classrooms } = await db.query('SELECT * FROM classrooms');
        const room = classrooms.find((item) => item.id == id);
        await db.query('DELETE FROM classrooms WHERE id = $1', [id]);
        if (room) {
            logClassroomAction(req, 'classroom.deleted', `Deleted classroom ${room.name}.`, room);
        }
        res.json({ message: 'Classroom decommissioned' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.updateClassroom = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, capacity, type, is_lab, maintenance_mode, maintenance_note } = req.body;
        const result = await db.query(
            'UPDATE classrooms SET name = $1, capacity = $2, type = $3, is_lab = $4, maintenance_mode = $5, maintenance_note = $6 WHERE id = $7 RETURNING *',
            [name, capacity, type || 'lecture', Boolean(is_lab), Boolean(maintenance_mode), maintenance_note || '', id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Classroom not found' });
        const room = result.rows[0];
        const summary = room.maintenance_mode
            ? `Updated classroom ${room.name} and marked it under maintenance.`
            : `Updated classroom ${room.name}.`;
        logClassroomAction(req, 'classroom.updated', summary, room);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
