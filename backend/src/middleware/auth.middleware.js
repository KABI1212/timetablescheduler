const jwt = require('jsonwebtoken');

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
        res.status(400).json({ error: 'Invalid token.' });
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
        if (!roles.includes(req.user?.role)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

module.exports = { authenticate, requireRole };
