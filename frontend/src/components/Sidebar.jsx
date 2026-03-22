import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import BrandMark from './BrandMark';

const menuItems = [
    { path: '/', label: 'Dashboard', icon: 'DB', roles: ['admin'] },
    { path: '/timetable-ai', label: 'AI Generator', icon: 'AI', roles: ['admin'] },
    { path: '/timetable-view', label: 'Timetable View', icon: 'TV', roles: ['admin', 'teacher'] },
    { path: '/timetable-editor', label: 'Timetable Editor', icon: 'ED', roles: ['admin'] },
    { path: '/teachers', label: 'Teachers', icon: 'TC', roles: ['admin'] },
    { path: '/classrooms', label: 'Classrooms', icon: 'CR', roles: ['admin'] },
    { path: '/subjects', label: 'Subjects', icon: 'SB', roles: ['admin'] },
    { path: '/availability', label: 'Availability', icon: 'AV', roles: ['admin', 'teacher'] },
    { path: '/absences', label: 'Absence Manager', icon: 'AB', roles: ['admin'] },
    { path: '/analytics', label: 'Analytics', icon: 'AN', roles: ['admin'] },
    { path: '/student-timetable', label: 'My Timetable', icon: 'ST', roles: ['student'] },
];

const normalizeRole = (role) => {
    const normalized = String(role || '').trim().toLowerCase();
    if (normalized === 'developer') return 'admin';
    return normalized;
};

/**
 * @param {Object} props
 * @param {string} [props.className]
 */
const Sidebar = ({ className = "" }) => {
    const location = useLocation();
    const userRaw = localStorage.getItem('chrono_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const role = normalizeRole(user?.role || 'student');

    return (
        <motion.aside
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            className={`w-64 bg-bgDark border-r border-borderGlow/40 flex flex-col z-20 ${className}`}
        >
            <div className="p-6 border-b border-borderGlow/30">
                <BrandMark compact subtitle="Campus Scheduler" />
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {menuItems
                    .filter((item) => item.roles.map(normalizeRole).includes(role))
                    .map(item => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link key={item.path} to={item.path}>
                            <motion.div
                                whileHover={{ scale: 1.05, x: 5 }}
                                whileTap={{ scale: 0.95 }}
                                className={`p-3 rounded-lg flex items-center space-x-3 cursor-pointer transition-colors ${isActive
                                    ? 'bg-primary/15 border border-primary text-primary shadow-blue-glow'
                                    : 'hover:bg-white/5 text-secondary'
                                    }`}
                            >
                                <span className="text-xs font-bold w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                    {item.icon}
                                </span>
                                <span className="font-medium">{item.label}</span>
                            </motion.div>
                        </Link>
                    );
                    })}
            </nav>
        </motion.aside>
    );
};

export default Sidebar;
