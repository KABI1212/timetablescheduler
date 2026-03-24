import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, ScatterChart, Scatter, CartesianGrid, ZAxis
} from 'recharts';
import { apiFetch } from '../utils/api';
import { useToast } from '../components/ToastProvider';

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const slotLabels = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];

const heatColor = (value) => {
    const intensity = Math.min(1, value / 6);
    const blue = Math.floor(180 + 75 * intensity);
    return `rgba(0, ${blue}, 255, ${0.15 + 0.6 * intensity})`;
};

const Analytics = () => {
    const [teacherWorkload, setTeacherWorkload] = useState(/** @type {any[]} */([]));
    const [roomUtilization, setRoomUtilization] = useState(/** @type {any[]} */([]));
    const [weeklyHeatmap, setWeeklyHeatmap] = useState(/** @type {any[]} */([]));
    const [subjectDistribution, setSubjectDistribution] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                const [workload, rooms, heatmap, subjects] = await Promise.all([
                    apiFetch('/analytics/teacher-workload'),
                    apiFetch('/analytics/room-utilization'),
                    apiFetch('/analytics/weekly-heatmap'),
                    apiFetch('/analytics/subject-distribution')
                ]);
                setTeacherWorkload(workload);
                setRoomUtilization(rooms);
                setWeeklyHeatmap(heatmap);
                setSubjectDistribution(subjects);
            } catch (err) {
                const error = /** @type {Error} */ (err);
                toast.error(error.message || 'Failed to load analytics');
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-72 skeleton" />
                    <div className="h-72 skeleton" />
                    <div className="h-72 skeleton" />
                    <div className="h-72 skeleton" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
                <p className="text-secondary text-sm">Live scheduling insights</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-glass p-6 rounded-2xl">
                    <h2 className="text-lg font-semibold text-white mb-4">Teacher Workload</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={teacherWorkload}>
                            <XAxis dataKey="teacher" tick={{ fill: '#A0D4FF', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#A0D4FF', fontSize: 10 }} />
                            <Tooltip />
                            <Bar dataKey="periods" fill="#00B4FF" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card-glass p-6 rounded-2xl">
                    <h2 className="text-lg font-semibold text-white mb-4">Classroom Utilization</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={roomUtilization}
                                dataKey="occupied"
                                nameKey="room"
                                innerRadius={50}
                                outerRadius={90}
                                paddingAngle={4}
                            >
                                {roomUtilization.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#00B4FF' : '#0066FF'} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="card-glass p-6 rounded-2xl">
                    <h2 className="text-lg font-semibold text-white mb-4">Weekly Period Heatmap</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <ScatterChart>
                            <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                type="number"
                                dataKey="dayIndex"
                                tickFormatter={(value) => dayLabels[value]}
                                tick={{ fill: '#A0D4FF', fontSize: 10 }}
                                domain={[0, 5]}
                            />
                            <YAxis
                                type="number"
                                dataKey="slotIndex"
                                tickFormatter={(value) => slotLabels[value]}
                                tick={{ fill: '#A0D4FF', fontSize: 10 }}
                                domain={[0, 7]}
                            />
                            <ZAxis dataKey="count" range={[60, 300]} />
                            <Scatter
                                data={weeklyHeatmap}
                                shape={(props) => {
                                    const { cx, cy, payload } = props;
                                    return (
                                        <rect
                                            x={cx - 14}
                                            y={cy - 10}
                                            width={28}
                                            height={20}
                                            rx={4}
                                            fill={heatColor(payload.count)}
                                            stroke="rgba(0,180,255,0.4)"
                                        />
                                    );
                                }}
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                <div className="card-glass p-6 rounded-2xl">
                    <h2 className="text-lg font-semibold text-white mb-4">Subject Distribution</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={subjectDistribution}
                                dataKey="periods"
                                nameKey="subject"
                                innerRadius={45}
                                outerRadius={90}
                                paddingAngle={3}
                            >
                                {subjectDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#00B4FF' : '#00FFD1'} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
