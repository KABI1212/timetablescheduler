const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { normalizeRole } = require('../middleware/auth.middleware');

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {string} password_hash
 * @property {string} role
 */

/**
 * @typedef {import('express').Request & { user?: { id: number, role: string, name: string } }} AuthenticatedRequest
 */

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user exists
        /** @type {{ rows: User[] }} */
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Assign role explicitly, default to student
        const requestedRole = normalizeRole(role || 'student');
        const userRole = ['admin', 'teacher', 'student'].includes(requestedRole) ? requestedRole : 'student';

        // Insert new user
        /** @type {{ rows: User[] }} */
        const newUser = await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, password_hash, userRole]
        );

        res.status(201).json({ message: 'User registered successfully', user: newUser.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.login = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !String(email).trim()) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Find user
        /** @type {{ rows: User[] }} */
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Admin access only.' });
        }

        const user = result.rows[0];
        const normalizedUserRole = normalizeRole(user.role);
        if (normalizedUserRole !== 'admin') {
            return res.status(401).json({ error: 'Admin access only.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, role: normalizedUserRole, name: user.name },
            // @ts-ignore
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const { rows: classrooms } = await db.query('SELECT * FROM classrooms');
        const defaultClass = classrooms && classrooms.length > 0 ? classrooms[0] : null;
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: normalizedUserRole,
                class_id: defaultClass ? defaultClass.id : null
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during login' });
    }
};

/**
 * @param {AuthenticatedRequest} req
 * @param {import('express').Response} res
 */
exports.getMe = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        /** @type {{ rows: User[] }} */
        const result = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const currentUser = result.rows[0];
        res.json({
            ...currentUser,
            role: normalizeRole(currentUser.role)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * @param {AuthenticatedRequest} req
 * @param {import('express').Response} res
 */
exports.changePassword = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword || String(newPassword).length < 8) {
            return res.status(400).json({ error: 'Current password and a new password of at least 8 characters are required.' });
        }

        const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        const matches = await bcrypt.compare(currentPassword, user.password_hash || '');
        if (!matches) return res.status(400).json({ error: 'Current password is incorrect.' });

        const passwordHash = await bcrypt.hash(newPassword, 10);
        db.updateUserPassword(user.id, passwordHash);

        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error while changing password' });
    }
};

const createTemporaryPassword = () => (
    `Temp-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 6)}`
);

/**
 * @param {AuthenticatedRequest} req
 * @param {import('express').Response} res
 */
exports.resetPassword = async (req, res) => {
    try {
        const { email, userId } = req.body;
        if (!email && !userId) {
            return res.status(400).json({ error: 'Email or userId is required.' });
        }

        const users = await db.query('SELECT * FROM users');
        const target = users.rows.find((user) => (
            (email && String(user.email).toLowerCase() === String(email).toLowerCase()) ||
            (userId && String(user.id) === String(userId))
        ));

        if (!target) return res.status(404).json({ error: 'User not found.' });

        const temporaryPassword = createTemporaryPassword();
        const passwordHash = await bcrypt.hash(temporaryPassword, 10);
        db.updateUserPassword(target.id, passwordHash);

        res.json({
            message: 'Temporary password generated.',
            user: {
                id: target.id,
                name: target.name,
                email: target.email,
                role: normalizeRole(target.role)
            },
            temporaryPassword
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error while resetting password' });
    }
};
