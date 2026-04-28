import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../utils/api';
import { useToast } from '../components/ToastProvider';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const slots = [
    { label: 'P1', time: '09:15', start: '09:15:00' },
    { label: 'P2', time: '10:00', start: '10:00:00' },
    { label: 'P3', time: '11:00', start: '11:00:00' },
    { label: 'P4', time: '11:45', start: '11:45:00' },
    { label: 'P5', time: '13:20', start: '13:20:00' },
    { label: 'P6', time: '14:05', start: '14:05:00' },
    { label: 'P7', time: '15:05', start: '15:05:00' },
    { label: 'P8', time: '15:55', start: '15:55:00' }
];

const availabilityLabels = {
    preferred: 'Preferred',
    blocked: 'Blocked',
    neutral: 'Neutral'
};

const TeacherAvailability = () => {
    const [summary, setSummary] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(true);
    const [leaveRequests, setLeaveRequests] = useState(/** @type {any[]} */([]));
    const toast = useToast();

    const summaryMap = useMemo(() => {
        const map = new Map();
        summary.forEach((entry) => {
            map.set(`${entry.day_of_week}-${entry.timeslot}`, entry);
        });
        return map;
    }, [summary]);

    const loadAvailability = async () => {
        try {
            const data = await apiFetch('/availability/summary');
            setSummary(data);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to load availability');
        } finally {
            setLoading(false);
        }
    };

    const loadLeaveRequests = async () => {
        try {
            const data = await apiFetch('/availability/leave');
            setLeaveRequests(data);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to load leave requests');
        }
    };

    useEffect(() => {
        loadAvailability();
        loadLeaveRequests();
    }, []);

    const updateLeaveStatus = async (id, status) => {
        const admin_note = window.prompt('Add a note (optional):') || '';
        try {
            await apiFetch(`/availability/leave/${id}`, {
                method: 'POST',
                body: JSON.stringify({ status, admin_note })
            });
            toast.success(`Leave ${status.toLowerCase()}`);
            loadLeaveRequests();
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Update failed');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Teacher Availability</h1>
                <p className="text-secondary text-sm">
                    Review preferred and blocked slots across faculty before generation
                </p>
            </div>

            <div className="card-glass rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-8">
                        <div className="h-10 skeleton mb-4" />
                        <div className="h-10 skeleton mb-4" />
                        <div className="h-10 skeleton" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left">
                            <thead className="bg-white/5 border-b border-white/10 text-secondary">
                                <tr>
                                    <th className="p-4">Time</th>
                                    {days.map((day) => (
                                        <th key={day} className="p-4 text-center">{day}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {slots.map((slot) => (
                                    <tr key={slot.start} className="border-b border-white/5">
                                        <td className="p-4 text-secondary">{slot.label} ({slot.time})</td>
                                        {days.map((day) => {
                                            const key = `${day}-${slot.start}`;
                                            const entry = summaryMap.get(key);
                                            return (
                                                <td key={key} className="p-3 text-center">
                                                    <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-secondary">
                                                        <div>{entry?.blocked || 0} blocked</div>
                                                        <div className="mt-1 text-success">{entry?.preferred || 0} preferred</div>
                                                        {!entry && <div className="mt-1">{availabilityLabels.neutral}</div>}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="card-glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Leave Status</h2>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                    {leaveRequests.length === 0 && (
                        <div className="text-secondary text-sm">No leave requests yet.</div>
                    )}
                    {leaveRequests.map((req) => (
                        <div key={req.id} className="p-4 rounded-lg border border-white/10 bg-white/5">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-white">{req.from_date} to {req.to_date}</div>
                                <span className={`text-xs font-semibold ${req.status === 'Approved'
                                    ? 'text-success'
                                    : req.status === 'Rejected'
                                        ? 'text-danger'
                                        : 'text-warning'
                                    }`}
                                >
                                    {req.status}
                                </span>
                            </div>
                            <p className="text-xs text-secondary mt-1">{req.reason}</p>
                            {req.admin_note && <p className="text-xs text-secondary mt-1">Note: {req.admin_note}</p>}
                            {req.status === 'Pending' && (
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => updateLeaveStatus(req.id, 'Approved')} className="btn-success px-3 py-1 rounded text-xs">Approve</button>
                                    <button onClick={() => updateLeaveStatus(req.id, 'Rejected')} className="btn-danger px-3 py-1 rounded text-xs">Reject</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TeacherAvailability;
