import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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

const normalizeRole = (role) => {
    const normalized = String(role || '').trim().toLowerCase();
    if (normalized === 'developer') return 'admin';
    return normalized;
};

const TeacherAvailability = () => {
    const userRaw = localStorage.getItem('chrono_user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const role = normalizeRole(user?.role || 'teacher');

    const [availability, setAvailability] = useState(/** @type {any[]} */([]));
    const [summary, setSummary] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(true);
    const [leaveRequests, setLeaveRequests] = useState(/** @type {any[]} */([]));
    const [leaveForm, setLeaveForm] = useState({ from_date: '', to_date: '', reason: '', type: 'sick' });
    const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
    const toast = useToast();

    const availabilityMap = useMemo(() => {
        const map = new Map();
        availability.forEach((entry) => {
            map.set(`${entry.day_of_week}-${entry.timeslot}`, entry);
        });
        return map;
    }, [availability]);

    const summaryMap = useMemo(() => {
        const map = new Map();
        summary.forEach((entry) => {
            map.set(`${entry.day_of_week}-${entry.timeslot}`, entry);
        });
        return map;
    }, [summary]);

    const loadAvailability = async () => {
        try {
            if (role === 'admin') {
                const data = await apiFetch('/availability/summary');
                setSummary(data);
            } else {
                const data = await apiFetch('/availability');
                setAvailability(data);
            }
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

    const handleToggle = async (day, slot) => {
        const key = `${day}-${slot.start}`;
        const existing = availabilityMap.get(key);
        const nextAvailable = existing ? !existing.is_available : false;
        try {
            await apiFetch('/availability', {
                method: 'POST',
                body: JSON.stringify({ day_of_week: day, timeslot: slot.start, is_available: nextAvailable })
            });
            toast.success('Availability updated');
            loadAvailability();
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Update failed');
        }
    };

    const validateLeave = () => {
        /** @type {Record<string, string>} */
        const nextErrors = {};
        if (!leaveForm.from_date) nextErrors.from_date = 'Start date required';
        if (!leaveForm.to_date) nextErrors.to_date = 'End date required';
        if (!leaveForm.reason.trim()) nextErrors.reason = 'Reason required';
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const submitLeave = async (e) => {
        e.preventDefault();
        if (!validateLeave()) return;
        try {
            await apiFetch('/availability/leave', {
                method: 'POST',
                body: JSON.stringify(leaveForm)
            });
            toast.success('Leave request submitted');
            setLeaveForm({ from_date: '', to_date: '', reason: '', type: 'sick' });
            setErrors({});
            loadLeaveRequests();
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Leave request failed');
        }
    };

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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div>
                <h1 className="text-3xl font-bold text-white">Teacher Availability</h1>
                <p className="text-secondary text-sm">Mark weekly availability and request leave</p>
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
                                    {days.map(day => (
                                        <th key={day} className="p-4 text-center">{day}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {slots.map((slot) => (
                                    <tr key={slot.start} className="border-b border-white/5">
                                        <td className="p-4 text-secondary">{slot.label} ({slot.time})</td>
                                        {days.map(day => {
                                            const key = `${day}-${slot.start}`;
                                            if (role === 'admin') {
                                                const entry = summaryMap.get(key);
                                                return (
                                                    <td key={key} className="p-3 text-center">
                                                        <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-secondary">
                                                            {entry ? `${entry.unavailable} unavailable` : '0 unavailable'}
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            const entry = availabilityMap.get(key);
                                            const unavailable = entry && !entry.is_available;
                                                    return (
                                                <td key={key} className="p-3 text-center">
                                                    <button
                                                        onClick={() => handleToggle(day, slot)}
                                                        className={`w-full rounded-lg p-2 text-xs font-semibold btn-state ${unavailable
                                                            ? 'btn-state-unavailable'
                                                            : 'btn-state-available'
                                                            }`}
                                                    >
                                                        {unavailable ? 'Unavailable' : 'Available'}
                                                    </button>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-glass rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Leave Request</h2>
                    <form onSubmit={submitLeave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-secondary text-sm mb-2">From</label>
                                <input
                                    type="date"
                                    className="w-full input-quantum p-3 rounded-lg"
                                    value={leaveForm.from_date}
                                    onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                                />
                                {errors.from_date && <p className="text-danger text-xs mt-1">{errors.from_date}</p>}
                            </div>
                            <div>
                                <label className="block text-secondary text-sm mb-2">To</label>
                                <input
                                    type="date"
                                    className="w-full input-quantum p-3 rounded-lg"
                                    value={leaveForm.to_date}
                                    onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                                />
                                {errors.to_date && <p className="text-danger text-xs mt-1">{errors.to_date}</p>}
                            </div>
                        </div>
                        <div>
                            <label className="block text-secondary text-sm mb-2">Type</label>
                            <select
                                className="w-full input-quantum p-3 rounded-lg"
                                value={leaveForm.type}
                                onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                            >
                                <option value="sick">Sick</option>
                                <option value="casual">Casual</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-secondary text-sm mb-2">Reason</label>
                            <textarea
                                className="w-full input-quantum p-3 rounded-lg"
                                rows={3}
                                value={leaveForm.reason}
                                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                            />
                            {errors.reason && <p className="text-danger text-xs mt-1">{errors.reason}</p>}
                        </div>
                        <button type="submit" className="btn-primary px-6 py-3 rounded-lg font-semibold">
                            Submit Leave Request
                        </button>
                    </form>
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
                                {role === 'admin' && req.status === 'Pending' && (
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
        </motion.div>
    );
};

export default TeacherAvailability;
