// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '../utils/api';
import { useToast } from '../components/ToastProvider';
import ConflictPanel from '../components/ConflictPanel';
import BrandMark from '../components/BrandMark';

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
            <div className="flex justify-between text-xs mb-1 text-secondary">
                <span className="uppercase tracking-widest">{label}</span>
                <span className="font-semibold">{value} / {max}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(value / max) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
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
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const toast = useToast();

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                const [res, audit, rooms] = await Promise.all([
                    apiFetch('/analytics'),
                    apiFetch('/analytics/audit-trail'),
                    apiFetch('/classrooms')
                ]);
                setData(res);
                setAuditTrail(audit);
                setBlockedRooms((rooms || []).filter((room) => room.maintenance_mode));
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
            } finally {
                setLoading(false);
            }
        };
        loadAnalytics();
    }, [toast]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-24 skeleton" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-28 skeleton" />
                    <div className="h-28 skeleton" />
                    <div className="h-28 skeleton" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="h-64 skeleton" />
                    <div className="h-64 skeleton" />
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { overview, teacherUtilization, classroomUtilization } = /** @type {AnalyticsData} */ (data);

    return (
        <div className="space-y-8 pb-10">
            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                    <BrandMark compact subtitle="Institution Scheduler" className="mb-4" />
                    <h1 className="text-4xl font-black text-white">LUMOGEN Operations Hub</h1>
                    <p className="text-xs text-secondary mt-1 tracking-widest uppercase">Timetable control, reviews, and delivery</p>
                </div>
                <div className="text-sm text-secondary">
                    System status: <span className="text-success font-semibold">Online</span>
                </div>
            </header>
            {loadError && (
                <div className="card-glass p-4 rounded-xl border border-warning/40 bg-warning/10 text-warning text-sm">
                    Analytics service is unavailable right now. You can still use all modules and generate timetables.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Faculty', value: overview.teachers, accent: 'primary' },
                    { label: 'Active Rooms', value: overview.classrooms, accent: 'success' },
                    { label: 'Subjects', value: overview.subjects, accent: 'warning' }
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className="card-glass p-6 rounded-xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -mr-10 -mt-10 blur-2xl" />
                        <h3 className="text-secondary text-[10px] uppercase font-bold tracking-[0.2em]">{stat.label}</h3>
                        <p className="text-5xl font-black mt-2 text-white tracking-tight">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="card-glass p-8 rounded-2xl"
                >
                    <h2 className="text-xl font-bold mb-6 text-white flex items-center">
                        <span className="w-2 h-2 bg-primary rounded-full mr-3 shadow-blue-glow"></span>
                        Resource Utilization
                    </h2>

                    <div className="grid grid-cols-1 gap-8">
                        <div>
                            <p className="text-xs font-bold text-secondary mb-4 uppercase tracking-widest">Faculty Load</p>
                            {teacherUtilization.slice(0, 4).map((t, i) => (
                                <UtilizationBar key={i} label={t.name} value={parseInt(t.classes_count)} max={10} tone="primary" />
                            ))}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-secondary mb-4 uppercase tracking-widest">Room Occupancy</p>
                            {classroomUtilization.slice(0, 4).map((c, i) => (
                                <UtilizationBar key={i} label={c.name} value={parseInt(c.classes_count)} max={10} tone="success" />
                            ))}
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                >
                    <div className="card-glass p-6 rounded-2xl">
                        <h2 className="text-xl font-bold mb-4 text-white">Live Signal</h2>
                        <div className="space-y-3 text-sm text-secondary">
                            <p>Monitoring class coverage across all active sections.</p>
                            <p>Tracking faculty load, room usage, and lab continuity.</p>
                            <p>LUMOGEN is ready for production timetable generation.</p>
                        </div>
                    </div>

                    <div className="card-glass p-6 rounded-2xl border border-primary/30 bg-primary/5">
                        <div className="text-[10px] uppercase tracking-widest text-primary mb-2">AI Insight</div>
                        <p className="text-secondary text-sm leading-relaxed">
                            Current schedule health is stable. Consider expanding lab availability to improve morning slot utilization.
                        </p>
                    </div>

                    <div className="card-glass p-6 rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Maintenance Blocks</h2>
                            <span className="text-xs text-secondary">{blockedRooms.length} active</span>
                        </div>
                        <div className="space-y-3">
                            {blockedRooms.length === 0 && (
                                <p className="text-secondary text-sm">No classrooms are currently blocked.</p>
                            )}
                            {blockedRooms.slice(0, 4).map((room) => (
                                <div key={room.id} className="rounded-xl border border-warning/30 bg-warning/10 p-3">
                                    <div className="text-sm text-white font-semibold">{room.name}</div>
                                    <div className="text-xs text-secondary mt-1">{room.maintenance_note || 'Blocked for maintenance'}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card-glass p-6 rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white">Recent Audit Trail</h2>
                            <span className="text-xs text-secondary">{auditTrail.length} events</span>
                        </div>
                        <div className="space-y-3">
                            {auditTrail.length === 0 && (
                                <p className="text-secondary text-sm">No recent admin activity logged.</p>
                            )}
                            {auditTrail.slice(0, 4).map((entry) => (
                                <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                    <div className="text-sm text-white">{entry.summary}</div>
                                    <div className="text-[11px] text-secondary mt-1">
                                        {entry.actor_name} · {new Date(entry.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            <ConflictPanel />
        </div>
    );
};

export default Dashboard;
