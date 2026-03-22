import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { apiFetch, logout } from '../utils/api';
import { useToast } from './ToastProvider';
import BrandMark from './BrandMark';

const normalizeRole = (role) => {
    const normalized = String(role || '').trim().toLowerCase();
    if (normalized === 'developer') return 'admin';
    return normalized;
};

/**
 * @param {Object} props
 * @param {string} [props.className]
 */
const Navbar = ({ className = "" }) => {
    const [notifications, setNotifications] = useState(/** @type {any[]} */([]));
    const [open, setOpen] = useState(false);
    const toast = useToast();

    const userRaw = localStorage.getItem('chrono_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const roleLabel = normalizeRole(user?.role || 'user').toUpperCase();

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.is_read).length,
        [notifications]
    );

    useEffect(() => {
        let active = true;
        const loadNotifications = async () => {
            try {
                const data = await apiFetch('/notifications');
                if (active) setNotifications(data);
            } catch (err) {
                const error = /** @type {Error} */ (err);
                toast.error(error.message || 'Failed to load notifications');
            }
        };
        loadNotifications();
        const interval = setInterval(loadNotifications, 30000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [toast]);

    const toggleDropdown = async () => {
        const next = !open;
        setOpen(next);
        if (next && unreadCount > 0) {
            try {
                await apiFetch('/notifications/read-all', { method: 'POST' });
                setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                toast.success('Notifications marked as read');
            } catch (err) {
                const error = /** @type {Error} */ (err);
                toast.error(error.message || 'Failed to mark notifications');
            }
        }
    };

    return (
        <header className={`h-16 card-glass flex items-center justify-between px-6 z-20 ${className}`}>
            <BrandMark compact subtitle="Scheduling Operations" />
            <div className="flex items-center space-x-6">
                <div className="relative">
                    <button
                        onClick={toggleDropdown}
                        className="relative w-10 h-10 rounded-full btn-icon flex items-center justify-center"
                    >
                        <span className="text-[11px] font-bold tracking-widest">NT</span>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger text-[10px] text-white flex items-center justify-center shadow-danger-glow">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    {open && (
                        <div className="absolute right-0 mt-3 w-80 card-glass rounded-xl p-4 z-30">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-semibold text-white">Notifications</p>
                                <span className="text-[10px] text-secondary">{notifications.length} total</span>
                            </div>
                            <div className="max-h-64 overflow-y-auto space-y-3">
                                {notifications.length === 0 && (
                                    <div className="text-xs text-secondary">No notifications yet.</div>
                                )}
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`p-3 rounded-lg border ${n.is_read
                                            ? 'border-white/5 bg-white/5'
                                            : 'border-primary/40 bg-primary/10'
                                            }`}
                                    >
                                        <p className="text-xs text-white">{n.message}</p>
                                        <p className="text-[10px] text-secondary mt-1">{new Date(n.created_at).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primaryGlow via-primary to-danger shadow-blue-glow"></div>
                    <span className="text-xs tracking-widest text-secondary">{roleLabel}</span>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={logout}
                    className="px-4 py-2 rounded-lg btn-outline text-xs uppercase tracking-widest"
                >
                    Sign Out
                </motion.button>
            </div>
        </header>
    );
};

export default Navbar;
