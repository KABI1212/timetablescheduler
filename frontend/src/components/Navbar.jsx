import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, logout } from '../utils/api';
import { useToast } from './ToastProvider';
import { normalizeRole } from '../config/navigation';

const readStoredUser = () => {
    const userRaw = localStorage.getItem('chrono_user');
    if (!userRaw) return null;

    try {
        return JSON.parse(userRaw);
    } catch {
        return null;
    }
};

/**
 * @param {Object} props
 * @param {string} [props.className]
 * @param {() => void} [props.onOpenSidebar]
 * @param {() => void} [props.onOpenCommandPalette]
 */
const Navbar = ({
    className = "",
    onOpenSidebar = () => { },
    onOpenCommandPalette = () => { }
}) => {
    const [notifications, setNotifications] = useState(/** @type {any[]} */([]));
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(/** @type {HTMLDivElement | null} */ (null));
    const toast = useToast();
    const user = readStoredUser();
    const roleLabel = normalizeRole(user?.role || 'user').toUpperCase();

    const unreadCount = useMemo(
        () => notifications.filter((notification) => !notification.is_read).length,
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

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (!dropdownRef.current?.contains(/** @type {Node} */ (event.target))) {
                setOpen(false);
            }
        };

        window.addEventListener('pointerdown', handlePointerDown);
        return () => window.removeEventListener('pointerdown', handlePointerDown);
    }, [open]);

    const toggleDropdown = async () => {
        const next = !open;
        setOpen(next);

        if (next && unreadCount > 0) {
            try {
                await apiFetch('/notifications/read-all', { method: 'POST' });
                setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
            } catch (err) {
                const error = /** @type {Error} */ (err);
                toast.error(error.message || 'Failed to mark notifications');
            }
        }
    };

    const todayLabel = useMemo(
        () => new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        }).format(new Date()),
        []
    );

    return (
        <header className={`sticky top-0 z-30 px-4 pt-4 md:px-6 ${className}`}>
            <div className="card-glass flex flex-wrap items-center justify-between gap-4 rounded-[1.8rem] px-4 py-4 md:px-5">
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        onClick={onOpenSidebar}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/50 text-[10px] font-semibold uppercase tracking-[0.3em] text-secondary lg:hidden"
                    >
                        Menu
                    </button>

                    <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.34em] text-primary">Campus Operations</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white">
                            <span className="font-semibold">{user?.name || 'Workspace user'}</span>
                            <span className="text-secondary">|</span>
                            <span className="text-secondary">{todayLabel}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={onOpenCommandPalette}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-[10px] font-semibold uppercase tracking-[0.3em] text-secondary sm:hidden"
                    >
                        Go
                    </button>

                    <button
                        onClick={onOpenCommandPalette}
                        className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left sm:inline-flex"
                    >
                        <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-[0.34em] text-secondary">Quick Actions</div>
                            <div className="mt-1 text-sm text-white">Search modules and jump faster</div>
                        </div>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-secondary">
                            Ctrl/Cmd + K
                        </span>
                    </button>

                    <div ref={dropdownRef} className="relative">
                        <button
                            onClick={toggleDropdown}
                            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/55 text-[10px] font-semibold uppercase tracking-[0.3em] text-secondary"
                        >
                            NT
                            {unreadCount > 0 && (
                                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white shadow-danger-glow">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        {open && (
                            <div className="absolute right-0 mt-3 w-[22rem] max-w-[calc(100vw-2rem)] rounded-[1.6rem] border border-white/10 bg-bgCard/95 p-4 shadow-[0_24px_70px_rgba(2,8,23,0.45)] backdrop-blur-xl">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-white">Notifications</p>
                                        <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-secondary">
                                            {notifications.length} total
                                        </p>
                                    </div>
                                </div>
                                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                                    {notifications.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.04] px-4 py-6 text-center text-sm text-secondary">
                                            No notifications yet.
                                        </div>
                                    )}
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`rounded-2xl border p-3 ${notification.is_read
                                                ? 'border-white/8 bg-white/[0.05]'
                                                : 'border-primary/35 bg-primary/10'
                                                }`}
                                        >
                                            <p className="text-sm leading-relaxed text-white">{notification.message}</p>
                                            <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-secondary">
                                                {new Date(notification.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="hidden rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 md:block">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-secondary">Role</div>
                        <div className="mt-1 text-sm font-semibold text-white">{roleLabel}</div>
                    </div>

                    <button
                        onClick={logout}
                        className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white transition hover:border-primary/30 hover:bg-primary/10"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
