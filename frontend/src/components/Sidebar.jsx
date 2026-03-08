import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/timetable-ai', label: 'AI Generator', icon: '🤖' },
    { path: '/teachers', label: 'Teachers', icon: '👨‍🏫' },
    { path: '/classrooms', label: 'Classrooms', icon: '🏢' },
    { path: '/subjects', label: 'Subjects', icon: '📚' },
];

/**
 * @param {Object} props
 * @param {string} [props.className]
 */
const Sidebar = ({ className = "" }) => {
    const location = useLocation();

    return (
        <motion.aside
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            className={`w-64 glassmorphism border-r border-white/10 flex flex-col z-20 ${className}`}
        >
            <div className="p-6 text-center border-b border-white/10">
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neonCyan to-neonPurple drop-shadow-md">
                    ChronoClass AI
                </h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map(item => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link key={item.path} to={item.path}>
                            <motion.div
                                whileHover={{ scale: 1.05, x: 5 }}
                                whileTap={{ scale: 0.95 }}
                                className={`p-3 rounded-lg flex items-center space-x-3 cursor-pointer transition-colors ${isActive
                                    ? 'bg-neonCyan/20 border border-neonCyan text-neonCyan shadow-neon-cyan'
                                    : 'hover:bg-white/5 text-gray-300'
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span>{item.label}</span>
                            </motion.div>
                        </Link>
                    );
                })}
            </nav>
        </motion.aside>
    );
};

export default Sidebar;
