import React from 'react';
import { motion } from 'framer-motion';
import { logout } from '../utils/api';

/**
 * @param {Object} props
 * @param {string} [props.className]
 */
const Navbar = ({ className = "" }) => {
    return (
        <header className={`h-16 glassmorphism border-b border-white/10 flex items-center justify-between px-6 z-20 ${className}`}>
            <h2 className="text-xl tracking-wider text-neonCyan font-semibold">
                SYSTEM <span className="text-neonPink">ONLINE</span>
            </h2>
            <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neonPurple to-neonCyan shadow-neon-purple animate-pulse" />
                    <span className="text-sm font-mono tracking-widest text-gray-300">ADMIN</span>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={logout}
                    className="text-xs bg-red-900/50 hover:bg-neonPink text-white border border-red-500/50 hover:border-neonPink px-3 py-1.5 rounded transition-colors shadow-sm"
                >
                    DISCONNECT
                </motion.button>
            </div>
        </header>
    );
};

export default Navbar;
