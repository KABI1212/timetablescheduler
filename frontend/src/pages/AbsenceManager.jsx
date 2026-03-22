// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '../utils/api';
import { useToast } from '../components/ToastProvider';

const AbsenceManager = () => {
    const [date, setDate] = useState('');
    const [schedule, setSchedule] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState(/** @type {any[]} */([]));
    const [selectedAbsence, setSelectedAbsence] = useState(/** @type {any | null} */ (null));
    const [absenceRecords, setAbsenceRecords] = useState(/** @type {any[]} */([]));
    const toast = useToast();

    const dayName = useMemo(() => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    }, [date]);

    const loadTimetable = async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/timetable');
            setSchedule(data);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to load timetable');
        } finally {
            setLoading(false);
        }
    };

    const loadAbsences = async () => {
        try {
            const data = await apiFetch('/absence');
            setAbsenceRecords(data);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to load absences');
        }
    };

    useEffect(() => {
        loadAbsences();
    }, []);

    const daySchedule = useMemo(() => {
        if (!dayName) return [];
        return schedule.filter((entry) => entry.day_of_week === dayName);
    }, [schedule, dayName]);

    const markAbsent = async (entry) => {
        if (!date) {
            toast.error('Select a date first');
            return;
        }
        try {
            const data = await apiFetch('/absence', {
                method: 'POST',
                body: JSON.stringify({
                    teacher_id: entry.teacher_id,
                    subject_id: entry.subject_id,
                    classroom_id: entry.classroom_id,
                    date,
                    day_of_week: entry.day_of_week,
                    start_time: entry.start_time,
                    end_time: entry.end_time,
                    reason: 'Marked absent by admin'
                })
            });
            setSelectedAbsence(data.absence);
            setSuggestions(data.suggestions || []);
            toast.success('Absence recorded. Select a substitute.');
            loadAbsences();
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to mark absence');
        }
    };

    const assignSubstitute = async (teacherId) => {
        if (!selectedAbsence) return;
        try {
            await apiFetch(`/absence/${selectedAbsence.id}/assign`, {
                method: 'POST',
                body: JSON.stringify({ substitute_teacher_id: teacherId })
            });
            toast.success('Substitute assigned');
            setSelectedAbsence(null);
            setSuggestions([]);
            loadAbsences();
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Assignment failed');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div>
                <h1 className="text-3xl font-bold text-white">Absence Manager</h1>
                <p className="text-secondary text-sm">Assign substitutes and update the live timetable</p>
            </div>

            <div className="card-glass p-6 rounded-2xl flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <label className="text-secondary text-sm">Date</label>
                    <input
                        type="date"
                        className="input-quantum p-3 rounded-lg"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                    <button onClick={loadTimetable} className="btn-primary px-4 py-2 rounded-lg text-sm">
                        Load Schedule
                    </button>
                </div>
                <div className="text-secondary text-sm">
                    {dayName ? `Day: ${dayName}` : 'Select a date'}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card-glass rounded-2xl overflow-hidden">
                    {loading ? (
                        <div className="p-8">
                            <div className="h-10 skeleton mb-4" />
                            <div className="h-10 skeleton" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left">
                                <thead className="bg-white/5 border-b border-white/10 text-secondary">
                                    <tr>
                                        <th className="p-4">Time</th>
                                        <th className="p-4">Subject</th>
                                        <th className="p-4">Teacher</th>
                                        <th className="p-4">Room</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {daySchedule.length === 0 && (
                                        <tr><td colSpan={5} className="p-4 text-center text-secondary">No schedule loaded for this day.</td></tr>
                                    )}
                                    {daySchedule.map((entry) => (
                                        <tr key={entry.id} className="border-b border-white/5">
                                            <td className="p-4 text-secondary">{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</td>
                                            <td className="p-4 text-white">{entry.subject_name}</td>
                                            <td className="p-4 text-secondary">{entry.teacher_name}</td>
                                            <td className="p-4 text-secondary">{entry.classroom_name}</td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => markAbsent(entry)} className="btn-danger px-3 py-1 rounded text-xs">
                                                    Mark Absent
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="card-glass rounded-2xl p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-white">Substitute Suggestions</h2>
                    {suggestions.length === 0 && (
                        <p className="text-secondary text-sm">Select an absence to see suggestions.</p>
                    )}
                    {suggestions.map((s) => (
                        <div key={s.teacher_id} className="p-3 rounded-lg border border-white/10 bg-white/5">
                            <p className="text-white text-sm">{s.teacher_name}</p>
                            <p className="text-secondary text-xs">Workload today: {s.day_load}</p>
                            <button
                                onClick={() => assignSubstitute(s.teacher_id)}
                                className="btn-primary px-3 py-1 rounded text-xs mt-2"
                            >
                                Assign Substitute
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card-glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Absence Records</h2>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                    {absenceRecords.length === 0 && (
                        <p className="text-secondary text-sm">No absence records yet.</p>
                    )}
                    {absenceRecords.map((record) => (
                        <div key={record.id} className="p-3 rounded-lg border border-white/10 bg-white/5">
                            <p className="text-sm text-white">{record.date} - {record.teacher_name}</p>
                            <p className="text-xs text-secondary">
                                Substitute: {record.substitute_teacher_name || 'Pending'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default AbsenceManager;
