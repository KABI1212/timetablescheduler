const db = require('../config/db');

/**
 * @param {import('express').Request & { user?: any }} req
 * @param {import('express').Response} res
 */
exports.getNotifications = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM notifications WHERE user_id = $1', [req.user?.id]);
        const sorted = result.rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json(sorted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request & { user?: any }} req
 * @param {import('express').Response} res
 */
exports.markAllRead = async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user?.id]);
        res.json({ message: 'Notifications marked as read' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
