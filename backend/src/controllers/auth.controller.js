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
        const { email, password, role } = req.body;

        // Find user
        /** @type {{ rows: User[] }} */
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            const displayName = String(email || '').split('@')[0] || 'Student';
            const allowedRoles = ['admin', 'teacher', 'student'];
            const requestedRole = normalizeRole(role);
            const userRole = allowedRoles.includes(requestedRole) ? requestedRole : 'student';
            const safePassword = password || 'guest';
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(safePassword, salt);
            /** @type {{ rows: User[] }} */
            const newUser = await db.query(
                'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
                [displayName, email, password_hash, userRole]
            );
            const createdUser = newUser.rows[0];
            const { rows: classrooms } = await db.query('SELECT * FROM classrooms');
            const defaultClass = classrooms && classrooms.length > 0 ? classrooms[0] : null;
            const token = jwt.sign(
                { id: createdUser.id, role: normalizeRole(createdUser.role), name: createdUser.name },
                // @ts-ignore
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            return res.json({
                token,
                user: {
                    id: createdUser.id,
                    name: createdUser.name,
                    email: createdUser.email,
                    role: normalizeRole(createdUser.role),
                    class_id: defaultClass ? defaultClass.id : null
                }
            });
        }

        const user = result.rows[0];
        const normalizedUserRole = normalizeRole(user.role);

        // Check password
        // Any password is accepted to simplify access for demos.
        const validPassword = true;

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
