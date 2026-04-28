// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useToast } from '../components/ToastProvider';
import ConflictPanel from '../components/ConflictPanel';
import BrandMark from '../components/BrandMark';

const decodeJwtRole = () => {
    const token = localStorage.getItem('chrono_token');
    if (!token) return 'admin';
    try {
        const payload = JSON.parse(atob(token.split('.')[1] || ''));
        return String(payload.role || 'admin').toLowerCase();
    } catch {
        return 'admin';
    }
};

/**
 * @param {{ label: string, value: number, max: number, tone: 'primary' | 'success' | 'warning' }} props
 */
const UtilizationBar = ({ label, value, max, tone }) => {
    const toneMap = {
        primary: 'bg-primary',
        success: 'bg-success',
        warning: 'bg-warning'
    };

    return (
        <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs text-secondary">
                <span className="uppercase tracking-widest">{label}</span>
                <span className="font-semibold">{value} / {max}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-white/5 bg-white/5">
                <div
                    style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, transition: 'width 240ms ease-out' }}
                    className={`h-full ${toneMap[tone]}`}
                />
            </div>
        </div>
    );
};

/**
 * @typedef {Object} AnalyticsOverview
 * @property {number} teachers
 * @property {number} classrooms
 * @property {number} subjects
 *
 * @typedef {Object} UtilizationData
 * @property {string} name
 * @property {string} classes_count
 *
 * @typedef {Object} AnalyticsData
 * @property {AnalyticsOverview} overview
 * @property {UtilizationData[]} teacherUtilization
 * @property {UtilizationData[]} classroomUtilization
 */

const Dashboard = () => {
    /** @type {AnalyticsData | null} */
    const initialData = null;
    const [data, setData] = useState(initialData);
    const [auditTrail, setAuditTrail] = useState(/** @type {any[]} */([]));
    const [blockedRooms, setBlockedRooms] = useState(/** @type {any[]} */([]));
    const [conflictCount, setConflictCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const toast = useToast();

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                const [res, audit, rooms, conflicts] = await Promise.all([
                    apiFetch('/analytics'),
                    apiFetch('/analytics/audit-trail'),
                    apiFetch('/classrooms'),
                    apiFetch('/timetable/validate-conflicts')
                ]);
                setData(res);
                setAuditTrail(audit);
                setBlockedRooms((rooms || []).filter((room) => room.maintenance_mode));
                setConflictCount(conflicts?.summary?.total || conflicts?.conflicts?.length || 0);
                setLoadError('');
            } catch (err) {
                const error = /** @type {Error} */ (err);
                toast.error(error.message || 'Failed to load analytics');
                setLoadError(error.message || 'Failed to load analytics');
                setData({
                    overview: { teachers: 0, classrooms: 0, subjects: 0 },
                    teacherUtilization: [],
                    classroomUtilization: []
                });
                setAuditTrail([]);
                setBlockedRooms([]);
                setConflictCount(0);
            } finally {
                setLoading(false);
            }
        };

        loadAnalytics();
    }, [toast]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-36 skeleton" />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="h-28 skeleton" />
                    <div className="h-28 skeleton" />
                    <div className="h-28 skeleton" />
                </div>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <div className="h-64 skeleton" />
                    <div className="h-64 skeleton" />
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { overview, teacherUtilization, classroomUtilization } = /** @type {AnalyticsData} */ (data);
    const role = decodeJwtRole();
    const quickActionsByRole = {
        admin: [
            { path: '/timetable-ai', label: 'Generate Options', detail: 'Run the AI scheduler and compare candidate drafts.' },
            { path: '/conflict-report', label: 'Review Conflicts', detail: `${conflictCount} timetable conflicts currently detected.` },
            { path: '/admin-backup', label: 'Backup Database', detail: 'Create a restore point before major operations.' }
        ],
        teacher: [
            { path: '/timetable-view', label: "Today's Schedule", detail: 'Review assigned classes and substitutions.' },
            { path: '/availability', label: 'Availability', detail: 'Maintain blocked and preferred slots.' },
            { path: '/profile', label: 'Profile', detail: 'Update account details and password.' }
        ],
        student: [
            { path: '/timetable-view', label: "Today's Classes", detail: 'Open the latest published timetable.' },
            { path: '/timetable-view', label: 'Weekly Timetable', detail: 'Scan the full weekly class grid.' },
            { path: '/profile', label: 'Profile', detail: 'Review account information.' }
        ]
    };
    const quickActions = quickActionsByRole[role] || quickActionsByRole.admin;

    return (
        <div className="space-y-8 pb-10">
            <header className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
                <div className="card-glass rounded-[2rem] p-6 md:p-8">
                    <BrandMark compact subtitle="Institution Scheduler" className="mb-6" />
                    <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] uppercase tracking-[0.34em] text-primary">
                        Operations Hub
                    </div>
                    <h1 className="mt-5 text-4xl font-black text-white md:text-5xl">
                        Shape the week before conflicts reach the classroom.
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-secondary md:text-base">
                        Monitor scheduling health, tune lab-heavy timetables, and move from AI draft to published schedule
                        with fewer manual hops.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                        <span className="rounded-full border border-success/30 bg-success/10 px-3 py-2 text-success">
                            System online
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-secondary">
                            Press Ctrl/Cmd + K for quick actions
                        </span>
                    </div>
                </div>

                <div className="card-glass rounded-[2rem] p-6">
                    <div className="text-[11px] uppercase tracking-[0.34em] text-primary">Quick Launch</div>
                    <div className="mt-4 space-y-3">
                        {quickActions.map((action) => (
                            <Link
                                key={action.path}
                                to={action.path}
                                className="block rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4 transition hover:border-primaryGlow/30 hover:bg-white/[0.08]"
                            >
                                <div className="text-sm font-semibold text-white">{action.label}</div>
                                <div className="mt-1 text-sm leading-relaxed text-secondary">{action.detail}</div>
                            </Link>
                        ))}
                    </div>
                    <div className="mt-4 rounded-[1.4rem] border border-primary/20 bg-primary/10 p-4">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-primary">Focus</div>
                        <p className="mt-2 text-sm leading-relaxed text-secondary">
                            Lab distribution, teacher availability, and draft validation are the highest-value checks before publishing.
                        </p>
                    </div>
                </div>
            </header>

            {loadError && (
                <div className="card-glass rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                    Analytics service is unavailable right now. You can still use all modules and generate timetables.
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {[
                    { label: 'Total Faculty', value: overview.teachers, accent: 'primary' },
                    { label: 'Active Rooms', value: overview.classrooms, accent: 'success' },
                    { label: 'Subjects', value: overview.subjects, accent: 'warning' },
                    { label: 'Conflicts', value: conflictCount, accent: 'primary' }
                ].map((stat, index) => (
                    <div key={index} className="card-glass relative overflow-hidden rounded-[1.8rem] p-6">
                        <div className="absolute right-0 top-0 h-24 w-24 -mr-8 -mt-8 rounded-full border border-primary/20 bg-primary/10" />
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">{stat.label}</h3>
                        <p className="mt-2 text-5xl font-black tracking-tight text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="card-glass rounded-[2rem] p-8">
                    <h2 className="mb-6 flex items-center text-xl font-bold text-white">
                        <span className="mr-3 h-2 w-2 rounded-full bg-primary shadow-blue-glow"></span>
                        Resource Utilization
                    </h2>

                    <div className="grid grid-cols-1 gap-8">
                        <div>
                            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-secondary">Faculty Load</p>
                            {teacherUtilization.slice(0, 4).map((teacher, index) => (
                                <UtilizationBar
                                    key={index}
                                    label={teacher.name}
                                    value={parseInt(teacher.classes_count, 10)}
                                    max={10}
                                    tone="primary"
                                />
                            ))}
                        </div>
                        <div>
                            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-secondary">Room Occupancy</p>
                            {classroomUtilization.slice(0, 4).map((classroom, index) => (
                                <UtilizationBar
                                    key={index}
                                    label={classroom.name}
                                    value={parseInt(classroom.classes_count, 10)}
                                    max={10}
                                    tone="success"
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card-glass rounded-[1.8rem] p-6">
                        <h2 className="mb-4 text-xl font-bold text-white">Live Signal</h2>
                        <div className="space-y-3 text-sm text-secondary">
                            <p>Monitoring class coverage across all active sections.</p>
                            <p>Tracking faculty load, room usage, and lab continuity.</p>
                            <p>ChronoCampus is ready for production timetable generation.</p>
                        </div>
                    </div>

                    <div className="card-glass rounded-[1.8rem] border border-primary/30 bg-primary/5 p-6">
                        <div className="mb-2 text-[10px] uppercase tracking-widest text-primary">AI Insight</div>
                        <p className="text-sm leading-relaxed text-secondary">
                            Current schedule health is stable. Use the command palette and quick launch shortcuts to move faster between generation, editing, and validation.
                        </p>
                    </div>

                    <div className="card-glass rounded-[1.8rem] p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Maintenance Blocks</h2>
                            <span className="text-xs text-secondary">{blockedRooms.length} active</span>
                        </div>
                        <div className="space-y-3">
                            {blockedRooms.length === 0 && (
                                <p className="text-sm text-secondary">No classrooms are currently blocked.</p>
                            )}
                            {blockedRooms.slice(0, 4).map((room) => (
                                <div key={room.id} className="rounded-xl border border-warning/30 bg-warning/10 p-3">
                                    <div className="text-sm font-semibold text-white">{room.name}</div>
                                    <div className="mt-1 text-xs text-secondary">{room.maintenance_note || 'Blocked for maintenance'}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card-glass rounded-[1.8rem] p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Recent Audit Trail</h2>
                            <span className="text-xs text-secondary">{auditTrail.length} events</span>
                        </div>
                        <div className="space-y-3">
                            {auditTrail.length === 0 && (
                                <p className="text-sm text-secondary">No recent admin activity logged.</p>
                            )}
                            {auditTrail.slice(0, 4).map((entry) => (
                                <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                    <div className="text-sm text-white">{entry.summary}</div>
                                    <div className="mt-1 text-[11px] text-secondary">
                                        {entry.actor_name} | {new Date(entry.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <ConflictPanel />
        </div>
    );
};

export default Dashboard;
