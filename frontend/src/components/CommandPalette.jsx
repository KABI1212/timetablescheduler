import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMenuItemsForRole } from '../config/navigation';
import { logout } from '../utils/api';

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.role
 */
const CommandPalette = ({ open, onClose, role }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!open) {
            setQuery('');
            return;
        }

        const timer = window.setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 20);

        return () => window.clearTimeout(timer);
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    const actions = useMemo(() => {
        const navigationActions = getMenuItemsForRole(role).map((item) => ({
            id: item.path,
            icon: item.icon,
            label: item.label,
            description: item.description,
            keywords: item.keywords || [],
            isActive: location.pathname === item.path,
            run: () => {
                navigate(item.path);
                onClose();
            }
        }));

        navigationActions.push({
            id: 'logout',
            icon: 'SO',
            label: 'Sign Out',
            description: 'End the current session and return to login',
            keywords: ['logout', 'exit', 'sign out'],
            isActive: false,
            run: () => {
                onClose();
                logout();
            }
        });

        return navigationActions;
    }, [location.pathname, navigate, onClose, role]);

    const normalizedQuery = query.trim().toLowerCase();
    const filteredActions = actions.filter((action) => {
        if (!normalizedQuery) return true;
        return [
            action.label,
            action.description,
            ...(action.keywords || [])
        ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery);
    });

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 py-8 sm:py-12">
            <button
                aria-label="Close command palette"
                className="command-backdrop"
                onClick={onClose}
            />
            <div className="command-card relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/10">
                <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primaryGlow to-transparent opacity-70" />
                <div className="border-b border-white/10 px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-primary">Go</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search pages, tools, and actions..."
                            className="w-full bg-transparent text-sm text-white placeholder:text-secondary/60 focus:outline-none"
                        />
                        <span className="hidden rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-secondary sm:inline-flex">
                            Esc
                        </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-secondary">
                        <span>Quick navigation</span>
                        <span>Ctrl/Cmd + K</span>
                    </div>
                </div>

                <div className="max-h-[65vh] overflow-y-auto p-3 sm:p-4">
                    {filteredActions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center">
                            <p className="text-sm font-semibold text-white">No matching results</p>
                            <p className="mt-2 text-sm text-secondary">Try searching for analytics, timetable, labs, or sign out.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredActions.map((action) => (
                                <button
                                    key={action.id}
                                    onClick={action.run}
                                    className={`w-full rounded-2xl border px-4 py-4 text-left transition duration-200 ${
                                        action.isActive
                                            ? 'border-primary/40 bg-primary/10'
                                            : 'border-white/8 bg-white/5 hover:border-primaryGlow/30 hover:bg-white/10'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                                            {action.icon}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-sm font-semibold text-white">{action.label}</span>
                                                {action.isActive && (
                                                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-primary">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-sm leading-relaxed text-secondary">{action.description}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
