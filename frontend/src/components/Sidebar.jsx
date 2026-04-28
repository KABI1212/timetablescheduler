import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import BrandMark from './BrandMark';
import { getMenuItemsForRole, normalizeRole } from '../config/navigation';

/**
 * @param {Object} props
 * @param {string} [props.className]
 * @param {boolean} [props.open]
 * @param {() => void} [props.onClose]
 */
const Sidebar = ({ className = "", open = false, onClose = () => { } }) => {
    const location = useLocation();
    const userRaw = localStorage.getItem('chrono_user');
    let user = null;
    if (userRaw) {
        try {
            user = JSON.parse(userRaw);
        } catch {
            user = null;
        }
    }
    const role = normalizeRole(user?.role || 'admin');
    const items = getMenuItemsForRole(role);

    return (
        <>
            {open && (
                <button
                    aria-label="Close navigation"
                    className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-[18rem] max-w-[85vw] -translate-x-full transition-transform duration-300 lg:static lg:z-20 lg:w-auto lg:max-w-none lg:translate-x-0 ${open ? 'translate-x-0' : ''} ${className}`}
            >
                <div className="flex h-full flex-col overflow-hidden border-r border-white/10 bg-bgDark/90 px-4 py-4 shadow-[0_30px_90px_rgba(2,8,23,0.45)] backdrop-blur-xl lg:rounded-[2rem] lg:border lg:border-white/10">
                    <div className="flex items-center justify-between rounded-[1.6rem] border border-white/10 bg-white/5 px-4 py-4">
                        <BrandMark compact subtitle="Campus Scheduler" />
                        <button
                            onClick={onClose}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/50 text-[10px] font-semibold uppercase tracking-[0.3em] text-secondary lg:hidden"
                        >
                            X
                        </button>
                    </div>

                    <div className="mt-4 rounded-[1.6rem] border border-primary/15 bg-gradient-to-br from-primary/12 via-transparent to-primaryGlow/8 px-4 py-4">
                        <div className="text-[11px] uppercase tracking-[0.34em] text-primary">Control Deck</div>
                        <p className="mt-2 text-sm font-semibold text-white">
                            Run scheduling ops with faster navigation.
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-secondary">
                            Use the refreshed shell or press <span className="text-white">Ctrl/Cmd + K</span> to jump anywhere instantly.
                        </p>
                    </div>

                    <nav className="mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
                        {items.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link key={item.path} to={item.path} onClick={onClose}>
                                    <div
                                        className={`group rounded-[1.35rem] border px-4 py-3 transition duration-200 ${isActive
                                            ? 'border-primary/35 bg-primary/12 text-white shadow-[0_18px_48px_rgba(255,180,77,0.16)]'
                                            : 'border-transparent bg-white/[0.04] text-secondary hover:border-white/10 hover:bg-white/[0.08] hover:text-white'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-xs font-semibold uppercase tracking-[0.28em] ${isActive
                                                ? 'border-primary/30 bg-slate-950/70 text-primary'
                                                : 'border-white/10 bg-slate-950/50 text-secondary group-hover:text-primary'
                                                }`}>
                                                {item.icon}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-semibold">{item.label}</div>
                                                <div className="mt-1 text-xs leading-relaxed text-secondary/80">
                                                    {item.description}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-4">
                        <div className="text-[11px] uppercase tracking-[0.32em] text-secondary">Session</div>
                        <div className="mt-2 text-sm font-semibold text-white">{user?.name || 'Workspace user'}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.26em] text-primary">{role}</div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
