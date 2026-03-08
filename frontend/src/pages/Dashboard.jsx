import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../utils/api';

const Terminal = () => {
    const [logs, setLogs] = useState(/** @type {string[]} */([]));
    const messages = [
        "Initializing Neural Link...",
        "Connecting to ChronoCore v1.0.4...",
        "Loading Classroom Matrix...",
        "Fetching Teacher Utilization Data...",
        "Optimizing Timetable Algorithms...",
        "Encryption Active: JWT_AES_256",
        "System Status: NEON_STABLE",
        "Awaiting User Input..."
    ];

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            if (i < messages.length) {
                setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${messages[i]}`].slice(-5));
                i++;
            } else {
                clearInterval(interval);
            }
        }, 1200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-black/80 p-4 rounded-lg border border-neonCyan/30 font-mono text-xs text-neonCyan terminal-flicker shadow-inner h-32 overflow-hidden relative">
            <div className="scanline"></div>
            {logs.map((log, idx) => (
                <div key={idx} className="mb-1 opacity-80">
                    <span className="text-neonPurple mr-2">$</span> {log}
                </div>
            ))}
            <div className="animate-pulse inline-block w-2 h-4 bg-neonCyan ml-1 align-middle"></div>
        </div>
    );
};

/**
 * @param {{ label: string, value: number, max: number, color: string }} props
 */
const UtilizationBar = ({ label, value, max, color }) => (
    <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400 uppercase tracking-tighter">{label}</span>
            <span className={`text-${color} font-bold`}>{value} / {max}</span>
        </div>
        <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-white/5">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(value / max) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full bg-${color} shadow-${color}`}
            />
        </div>
    </div>
);

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                const res = await apiFetch('/analytics');
                setData(res);
            } catch (err) {
                console.error("Failed to load analytics", err);
            } finally {
                setLoading(false);
            }
        };
        loadAnalytics();
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96">
            <div className="w-16 h-16 border-4 border-t-neonCyan border-transparent rounded-full animate-spin shadow-neon-cyan"></div>
            <p className="mt-4 text-neonCyan font-mono tracking-widest animate-pulse">SYNCHRONIZING...</p>
        </div>
    );

    if (!data) return null;

    const { overview, teacherUtilization, classroomUtilization } = /** @type {AnalyticsData} */ (data);

    return (
        <div className="space-y-8 pb-10">
            <header className="flex justify-between items-end border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neonCyan to-neonPurple italic">
                        SYSTEM_DASHBOARD
                    </h1>
                    <p className="text-xs text-gray-500 font-mono mt-1">OPERATOR ACCESS GRANTED // READY TO SCHEDULE</p>
                </div>
                <div className="text-right hidden md:block">
                    <p className="text-[10px] text-neonPink font-mono uppercase">Neural Node Status</p>
                    <p className="text-sm font-bold text-green-400">ONLINE</p>
                </div>
            </header>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total faculty', value: overview.teachers, color: 'neonCyan' },
                    { label: 'Asset Nodes', value: overview.classrooms, color: 'neonPink' },
                    { label: 'Data Modules', value: overview.subjects, color: 'neonPurple' }
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className={`glassmorphism p-6 rounded-xl border-l-4 border-${stat.color} relative overflow-hidden group`}
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-${stat.color}/10 transition-all`} />
                        <h3 className="text-gray-400 text-[10px] uppercase font-bold tracking-[0.2em]">{stat.label}</h3>
                        <p className={`text-5xl font-black mt-2 text-${stat.color} tracking-tighter`}>{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Utilization Charts */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glassmorphism p-8 rounded-2xl border border-white/5"
                >
                    <h2 className="text-xl font-bold mb-6 text-white flex items-center">
                        <span className="w-2 h-2 bg-neonCyan rounded-full mr-3 shadow-neon-cyan"></span>
                        Resource Utilization
                    </h2>

                    <div className="grid grid-cols-1 gap-8">
                        <div>
                            <p className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">Faculty Load</p>
                            {teacherUtilization.slice(0, 4).map((t, i) => (
                                <UtilizationBar key={i} label={t.name} value={parseInt(t.classes_count)} max={10} color="neonCyan" />
                            ))}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">Node Occupancy</p>
                            {classroomUtilization.slice(0, 4).map((c, i) => (
                                <UtilizationBar key={i} label={c.name} value={parseInt(c.classes_count)} max={10} color="neonPink" />
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* System Terminal & AI Insight */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                >
                    <div>
                        <h2 className="text-xl font-bold mb-4 text-white flex items-center">
                            <span className="w-2 h-2 bg-neonPurple rounded-full mr-3 shadow-neon-purple"></span>
                            System Heartbeat
                        </h2>
                        <Terminal />
                    </div>

                    <div className="glassmorphism p-6 rounded-xl border border-neonPink/20 bg-neonPink/5 relative overflow-hidden">
                        <div className="absolute top-2 right-4 text-[10px] font-mono text-neonPink animate-pulse">AI BRAIN ACTIVE</div>
                        <h3 className="text-neonPink font-bold text-sm mb-2 uppercase italic tracking-widest">Chrono-Inference</h3>
                        <p className="text-gray-300 text-sm leading-relaxed">
                            Found <span className="text-neonCyan font-bold">2 optimization pathways</span> in current schedule matrix.
                            Resource distribution is currently <span className="text-neonCyan">Optimal</span>.
                            Consider adding more 'Data Modules' to balance Faculty Load.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
