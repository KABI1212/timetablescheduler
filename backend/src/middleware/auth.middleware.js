const jwt = require('jsonwebtoken');

const normalizeRole = (role) => {
    const normalized = String(role || '').trim().toLowerCase();
    if (normalized === 'developer') return 'admin';
    return normalized;
};

/**
 * @param {import('express').Request & { user?: any }} req 
 * @param {import('express').Response} res 
 * @param {import('express').NextFunction} next 
 */
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '');
        req.user = decoded;
        next();
    } catch (ex) {
        const isExpired = ex?.name === 'TokenExpiredError';
        res.status(401).json({ error: isExpired ? 'Token expired. Please sign in again.' : 'Invalid token.' });
    }
};

/**
 * @param {import('express').Request & { user?: any }} req 
 * @param {import('express').Response} res 
 * @param {import('express').NextFunction} next 
 */
const authenticateSse = (req, res, next) => {
    const token = req.query.token || req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '');
        req.user = decoded;
        next();
    } catch (ex) {
        const isExpired = ex?.name === 'TokenExpiredError';
        res.status(401).json({ error: isExpired ? 'Token expired. Please sign in again.' : 'Invalid token.' });
    }
};

/**
 * @param {string[]} roles
 */
const requireRole = (roles) => {
    /**
     * @param {import('express').Request & { user?: any }} req 
     * @param {import('express').Response} res 
     * @param {import('express').NextFunction} next 
     */
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const allowedRoles = roles.map(normalizeRole);
        const userRole = normalizeRole(req.user.role);

        if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
            return next();
        }

        return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
    };
};

module.exports = { authenticate, authenticateSse, requireRole, normalizeRole };
