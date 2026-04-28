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

/**
 * @param {import('express').Request & { user?: any }} req
 * @param {import('express').Response} res
 */
exports.markOneRead = async (req, res) => {
    try {
        const notification = db.markNotificationRead(req.user?.id, req.params.id);
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        res.json({ message: 'Notification marked as read', notification });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {import('express').Request & { user?: any }} req
 * @param {import('express').Response} res
 */
exports.clearAll = async (req, res) => {
    try {
        db.clearNotifications(req.user?.id);
        res.json({ message: 'Notifications cleared' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
