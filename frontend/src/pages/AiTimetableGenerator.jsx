// @ts-nocheck
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiFetch, API_URL } from '../utils/api';
import { useToast } from '../components/ToastProvider';
import ConflictPanel from '../components/ConflictPanel';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = [
    { label: 'P1', time: '09:15 - 10:00', start: '09:15:00' },
    { label: 'P2', time: '10:00 - 10:45', start: '10:00:00' },
    { label: 'BREAK', time: '10:45 - 11:00', isBreak: true },
    { label: 'P3', time: '11:00 - 11:45', start: '11:00:00' },
    { label: 'P4', time: '11:45 - 12:30', start: '11:45:00' },
    { label: 'LUNCH', time: '12:30 - 13:20', isBreak: true },
    { label: 'P5', time: '13:20 - 14:05', start: '13:20:00' },
    { label: 'P6', time: '14:05 - 14:50', start: '14:05:00' },
    { label: 'BREAK', time: '14:50 - 15:05', isBreak: true },
    { label: 'P7', time: '15:05 - 15:50', start: '15:05:00' },
    { label: 'P8', time: '15:55 - 16:40', start: '15:55:00' }
];
const TOTAL_PERIODS_PER_CLASSROOM = days.length * timeSlots.filter((slot) => !slot.isBreak).length;

const getNextTeachingSlotIndex = (startIndex) => {
    for (let index = startIndex + 1; index < timeSlots.length; index += 1) {
        if (!timeSlots[index].isBreak) return index;
    }
    return -1;
};

const isSameLabBlock = (entry, nextEntry) => (
    Boolean(
        entry &&
        nextEntry &&
        entry.session_type === 'lab' &&
        nextEntry.session_type === 'lab' &&
        entry.subject_id === nextEntry.subject_id &&
        entry.teacher_id === nextEntry.teacher_id &&
        entry.classroom_id === nextEntry.classroom_id
    )
);

const formatDateTime = (value) => {
    if (!value) return 'Not available';
    return new Date(value).toLocaleString();
};

const AiTimetableGenerator = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [selectingOptionId, setSelectingOptionId] = useState('');
    const [rollingBackId, setRollingBackId] = useState('');
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('Awaiting command...');
    const [generationInfo, setGenerationInfo] = useState('');
    /** @type {[any[], React.Dispatch<React.SetStateAction<any[]>>]} */
    const [schedule, setSchedule] = useState([]);
    /** @type {[any[], React.Dispatch<React.SetStateAction<any[]>>]} */
    const [options, setOptions] = useState([]);
    /** @type {[any[], React.Dispatch<React.SetStateAction<any[]>>]} */
    const [history, setHistory] = useState([]);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [classrooms, setClassrooms] = useState([]);

    const [quickSubject, setQuickSubject] = useState({ name: '', code: '', theory_hours: '3' });
    const [quickErrors, setQuickErrors] = useState(/** @type {Record<string, string>} */ ({}));

    const toast = useToast();
    const tableRef = useRef(/** @type {HTMLDivElement | null} */ (null));

    useEffect(() => {
        loadWorkspace();
    }, []);

    useEffect(() => {
        if (classrooms.length === 0) {
            setSelectedRoom('');
            return;
        }
        const availableRooms = classrooms.map((room) => room.name);
        if (!selectedRoom || !availableRooms.includes(selectedRoom)) {
            setSelectedRoom(availableRooms[0]);
        }
    }, [classrooms, selectedRoom]);

    const rooms = useMemo(
        () => classrooms.map((room) => room.name),
        [classrooms]
    );

    const roomCounts = useMemo(() => schedule.reduce((acc, entry) => {
        const roomName = entry.classroom_name;
        acc[roomName] = (acc[roomName] || 0) + 1;
        return acc;
    }, /** @type {Record<string, number>} */ ({})), [schedule]);

    const selectedOption = useMemo(
        () => options.find((option) => option.is_selected) || null,
        [options]
    );

    const scheduleMap = useMemo(() => {
        const map = new Map();
        schedule
            .filter((entry) => entry.classroom_name === selectedRoom)
            .forEach((entry) => {
                map.set(`${entry.day_of_week}-${entry.start_time}`, entry);
            });
        return map;
    }, [schedule, selectedRoom]);

    const loadWorkspace = async () => {
        setLoading(true);
        try {
            const [draftSchedule, workflowStatus, generatedOptions, versionHistory, classroomList] = await Promise.all([
                apiFetch('/timetable/working'),
                apiFetch('/timetable/status'),
                apiFetch('/timetable/options'),
                apiFetch('/timetable/history'),
                apiFetch('/classrooms')
            ]);
            setSchedule(draftSchedule);
            setStatus(workflowStatus);
            setOptions(generatedOptions);
            setHistory(versionHistory);
            setClassrooms(classroomList);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to load timetable workspace');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setProgress(5);
        setProgressMessage('Generating candidate timetable options...');
        setGenerationInfo('');

        const token = localStorage.getItem('chrono_token');
        const eventSource = new EventSource(`${API_URL}/timetable/generate/progress?token=${token}`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.progress !== undefined) setProgress(data.progress);
                if (data.message) setProgressMessage(data.message);
                if (data.generation) {
                    setGenerationInfo(`Generation ${data.generation} - Fitness ${data.fitness}%`);
                }
                if (data.status === 'complete') {
                    eventSource.close();
                }
            } catch (err) {
                console.error('Invalid SSE payload', err);
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
            setIsGenerating(false);
            toast.error('Progress stream disconnected');
        };

        try {
            await apiFetch('/timetable/generate', { method: 'POST' });
            await loadWorkspace();
            tableRef.current?.scrollIntoView({ behavior: 'smooth' });
            toast.success('Draft options generated');
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to generate timetable');
            setProgress(0);
        } finally {
            setIsGenerating(false);
            eventSource.close();
        }
    };

    const handleSelectOption = async (optionId) => {
        setSelectingOptionId(optionId);
        try {
            await apiFetch(`/timetable/options/${optionId}/select`, { method: 'POST' });
            await loadWorkspace();
            toast.success('Draft option loaded');
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to switch draft option');
        } finally {
            setSelectingOptionId('');
        }
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            await apiFetch('/timetable/publish', { method: 'POST' });
            await loadWorkspace();
            toast.success('Draft published to all live views');
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to publish timetable');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleRollback = async (versionId) => {
        setRollingBackId(versionId);
        try {
            await apiFetch(`/timetable/history/${versionId}/rollback`, { method: 'POST' });
            await loadWorkspace();
            toast.success('Timetable version restored');
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Rollback failed');
        } finally {
            setRollingBackId('');
        }
    };

    const validateQuickSubject = () => {
        /** @type {Record<string, string>} */
        const nextErrors = {};
        if (!quickSubject.name.trim()) nextErrors.name = 'Subject name is required.';
        if (!quickSubject.code.trim()) nextErrors.code = 'Subject code is required.';
        const theoryHours = parseInt(quickSubject.theory_hours, 10);
        if (!Number.isFinite(theoryHours) || theoryHours <= 0) nextErrors.theory_hours = 'Theory hours must be a positive number.';
        setQuickErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleQuickAdd = async (e) => {
        e.preventDefault();
        if (!validateQuickSubject()) return;
        try {
            const theoryHours = parseInt(quickSubject.theory_hours, 10);
            await apiFetch('/subjects', {
                method: 'POST',
                body: JSON.stringify({
                    name: quickSubject.name.trim(),
                    code: quickSubject.code.trim(),
                    credits: 3,
                    is_lab: false,
                    lab_duration: 1,
                    theory_hours: Number.isFinite(theoryHours) ? theoryHours : 3,
                    lab_hours: 0
                })
            });
            toast.success('Subject added');
            setQuickSubject({ name: '', code: '', theory_hours: '3' });
            setQuickErrors({});
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to add subject');
        }
    };

    const renderDayCells = (day) => {
        const cells = [];
        for (let index = 0; index < timeSlots.length; index += 1) {
            const slot = timeSlots[index];
            if (slot.isBreak) {
                cells.push(
                    <td
                        key={`${day}-${slot.time}-break`}
                        className="p-2 border-b border-r border-white/10 text-center text-[10px] uppercase tracking-widest bg-break text-secondary"
                    >
                        {slot.label}
                    </td>
                );
                continue;
            }

            const key = `${day}-${slot.start}`;
            const entry = scheduleMap.get(key);
            const nextIndex = getNextTeachingSlotIndex(index);
            const nextSlot = nextIndex >= 0 ? timeSlots[nextIndex] : null;
            const nextEntry = nextSlot ? scheduleMap.get(`${day}-${nextSlot.start}`) : null;
            const isCombinedLab = isSameLabBlock(entry, nextEntry);

            cells.push(
                <td key={key} colSpan={isCombinedLab ? 2 : 1} className="p-2 border-b border-r border-white/10 h-24 align-top">
                    {entry ? (
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="h-full flex flex-col justify-between p-2 rounded-lg border-l-4 bg-primary/10 border-primary"
                        >
                            <div className="font-bold text-white text-xs leading-tight">
                                {entry.subject_name}
                            </div>
                            <div className="mt-1 text-[10px] uppercase tracking-widest text-secondary">
                                {isCombinedLab
                                    ? `Lab Period ${slot.label}-${nextSlot?.label || ''}`
                                    : entry.session_type === 'lab'
                                        ? 'Lab Period'
                                        : 'Theory Period'}
                            </div>
                            <div className="mt-1 text-[11px] text-secondary flex items-center gap-1">
                                <span className="opacity-70 text-[9px] tracking-tighter">PROF:</span> {entry.substitute_teacher_name || entry.teacher_name}
                            </div>
                            <div className="mt-auto pt-2 text-[10px] text-right font-semibold text-secondary uppercase tracking-widest">
                                {entry.classroom_name}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="h-full border border-dashed border-white/10 rounded-lg flex items-center justify-center text-[10px] text-secondary/50">
                            Vacant
                        </div>
                    )}
                </td>
            );

            if (isCombinedLab) {
                index = nextIndex;
            }
        }
        return cells;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold text-white">AI Timetable Generator</h1>
                <p className="text-secondary italic">Generate multiple draft options, review one, then publish it.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                <div className="card-glass p-5 rounded-2xl">
                    <div className="text-[10px] uppercase tracking-widest text-secondary mb-2">Workflow State</div>
                    <div className="text-2xl font-bold text-white">{status?.status || 'idle'}</div>
                </div>
                <div className="card-glass p-5 rounded-2xl">
                    <div className="text-[10px] uppercase tracking-widest text-secondary mb-2">Draft Entries</div>
                    <div className="text-2xl font-bold text-white">{status?.draft_entry_count || 0}</div>
                </div>
                <div className="card-glass p-5 rounded-2xl">
                    <div className="text-[10px] uppercase tracking-widest text-secondary mb-2">Published Entries</div>
                    <div className="text-2xl font-bold text-white">{status?.published_entry_count || 0}</div>
                </div>
                <div className="card-glass p-5 rounded-2xl">
                    <div className="text-[10px] uppercase tracking-widest text-secondary mb-2">Generated Options</div>
                    <div className="text-2xl font-bold text-white">{status?.option_count || 0}</div>
                </div>
                <div className="card-glass p-5 rounded-2xl border border-danger/30">
                    <div className="text-[10px] uppercase tracking-widest text-secondary mb-2">Draft Hard Conflicts</div>
                    <div className="text-2xl font-bold text-white">{status?.draft_hard_conflict_count || 0}</div>
                </div>
                <div className="card-glass p-5 rounded-2xl border border-warning/30">
                    <div className="text-[10px] uppercase tracking-widest text-secondary mb-2">Draft Soft Conflicts</div>
                    <div className="text-2xl font-bold text-white">{status?.draft_soft_conflict_count || 0}</div>
                </div>
            </div>

            <div className="card-glass p-6 rounded-2xl">
                <form onSubmit={handleQuickAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-secondary text-sm mb-2">Subject Name</label>
                        <input
                            className="w-full input-quantum p-3 rounded-lg"
                            value={quickSubject.name}
                            onChange={(e) => setQuickSubject({ ...quickSubject, name: e.target.value })}
                        />
                        {quickErrors.name && <p className="text-danger text-xs mt-1">{quickErrors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-secondary text-sm mb-2">Subject Code</label>
                        <input
                            className="w-full input-quantum p-3 rounded-lg"
                            value={quickSubject.code}
                            onChange={(e) => setQuickSubject({ ...quickSubject, code: e.target.value })}
                        />
                        {quickErrors.code && <p className="text-danger text-xs mt-1">{quickErrors.code}</p>}
                    </div>
                    <div>
                        <label className="block text-secondary text-sm mb-2">Theory Hours / Week</label>
                        <input
                            type="number"
                            min="1"
                            className="w-full input-quantum p-3 rounded-lg"
                            value={quickSubject.theory_hours}
                            onChange={(e) => setQuickSubject({ ...quickSubject, theory_hours: e.target.value })}
                        />
                        {quickErrors.theory_hours && <p className="text-danger text-xs mt-1">{quickErrors.theory_hours}</p>}
                    </div>
                    <button type="submit" className="btn-primary px-6 py-3 rounded-lg font-semibold">
                        Add Subject
                    </button>
                </form>
            </div>

            <div className="card-glass p-8 rounded-2xl text-center space-y-6">
                <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-primaryGlow"
                        style={{ width: `${progress}%`, transition: 'width 180ms linear' }}
                    />
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                    <div className="text-secondary">
                        <p className="font-semibold">{progressMessage}</p>
                        {generationInfo && <p className="text-xs mt-1">{generationInfo}</p>}
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={`px-8 py-3 rounded-xl font-bold tracking-widest uppercase transition-all ${isGenerating
                            ? 'btn-primary opacity-60 cursor-not-allowed'
                            : 'btn-primary'
                            }`}
                    >
                        {isGenerating ? 'Generating...' : 'Generate Draft Options'}
                    </button>
                </div>
            </div>

            <div className="card-glass p-6 rounded-2xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">Review Queue</h2>
                        <p className="text-secondary text-sm">
                            Last generated: {formatDateTime(status?.last_generated_at)}
                        </p>
                        <p className="text-secondary text-sm">
                            Last published: {formatDateTime(status?.last_published_at)}
                        </p>
                        <p className="text-secondary text-sm">
                            Version snapshots: {status?.version_count || 0} | Maintenance blocks: {status?.maintenance_block_count || 0}
                        </p>
                    </div>
                    <button
                        onClick={handlePublish}
                        disabled={isPublishing || !status?.has_draft}
                        className={`px-5 py-3 rounded-lg font-semibold ${isPublishing || !status?.has_draft
                            ? 'btn-outline opacity-60 cursor-not-allowed'
                            : 'btn-primary'
                            }`}
                    >
                        {isPublishing ? 'Publishing...' : 'Publish Current Draft'}
                    </button>
                </div>

                {options.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 p-6 text-secondary text-sm">
                        No generated options yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {options.map((option) => (
                            <div
                                key={option.id}
                                className={`rounded-2xl border p-5 ${option.is_selected
                                    ? 'border-primary bg-primary/10'
                                    : 'border-white/10 bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-white font-semibold">{option.label}</div>
                                        <div className="text-secondary text-xs">{formatDateTime(option.created_at)}</div>
                                    </div>
                                    {option.is_published && (
                                        <span className="px-2 py-1 rounded-full text-[10px] uppercase tracking-widest bg-success/15 text-success">
                                            Published
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4 text-sm md:grid-cols-4">
                                    <div>
                                        <div className="text-secondary text-[10px] uppercase tracking-widest">Fitness</div>
                                        <div className="text-white font-semibold">{option.fitness}</div>
                                    </div>
                                    <div>
                                        <div className="text-secondary text-[10px] uppercase tracking-widest">Total Conflicts</div>
                                        <div className="text-white font-semibold">{option.conflict_count}</div>
                                    </div>
                                    <div>
                                        <div className="text-secondary text-[10px] uppercase tracking-widest">Hard</div>
                                        <div className="text-white font-semibold">{option.hard_conflict_count || 0}</div>
                                    </div>
                                    <div>
                                        <div className="text-secondary text-[10px] uppercase tracking-widest">Soft</div>
                                        <div className="text-white font-semibold">{option.soft_conflict_count || 0}</div>
                                    </div>
                                    <div>
                                        <div className="text-secondary text-[10px] uppercase tracking-widest">Entries</div>
                                        <div className="text-white font-semibold">{option.entry_count}</div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleSelectOption(option.id)}
                                    disabled={selectingOptionId === option.id || option.is_selected}
                                    className={`w-full mt-5 px-4 py-2 rounded-lg text-sm font-semibold ${option.is_selected
                                        ? 'btn-outline opacity-70 cursor-default'
                                        : 'btn-primary'
                                        }`}
                                >
                                    {option.is_selected
                                        ? 'Selected For Review'
                                        : selectingOptionId === option.id
                                            ? 'Loading Draft...'
                                            : 'Use As Draft'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="pt-2">
                    <h3 className="text-sm font-semibold text-white mb-3">Version History</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {history.length === 0 && (
                            <div className="rounded-xl border border-dashed border-white/10 p-4 text-secondary text-sm">
                                No timetable snapshots yet.
                            </div>
                        )}
                        {history.map((version) => (
                            <div key={version.id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div>
                                    <div className="text-white text-sm font-semibold">
                                        {version.scope.toUpperCase()} · {version.action}
                                    </div>
                                    <div className="text-secondary text-xs">
                                        {formatDateTime(version.created_at)} · {version.entry_count} entries
                                    </div>
                                    {version.note && <div className="text-secondary text-xs mt-1">{version.note}</div>}
                                </div>
                                <button
                                    onClick={() => handleRollback(version.id)}
                                    disabled={rollingBackId === version.id}
                                    className={`px-4 py-2 rounded-lg text-sm ${rollingBackId === version.id ? 'btn-outline opacity-60 cursor-not-allowed' : 'btn-outline'}`}
                                >
                                    {rollingBackId === version.id ? 'Rolling Back...' : 'Rollback'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <ConflictPanel />

            <div ref={tableRef}>
                {loading ? (
                    <div className="h-64 skeleton" />
                ) : schedule.length === 0 ? (
                    <div className="card-glass p-10 text-center text-secondary">No draft timetable is loaded yet.</div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 card-glass p-4 rounded-xl">
                            <div>
                                <div className="text-secondary uppercase tracking-widest text-xs">Draft Preview</div>
                                <div className="text-white font-semibold">{selectedOption?.label || 'Manual Draft'}</div>
                            </div>
                            <div className="flex flex-wrap gap-3 items-center">
                                <span className="text-secondary uppercase tracking-widest text-xs">Target Class</span>
                                <div className="flex flex-wrap gap-2">
                                    {rooms.map((room) => (
                                        <button
                                            key={room}
                                            onClick={() => setSelectedRoom(room)}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold ${selectedRoom === room
                                                ? 'btn-primary'
                                                : 'btn-outline'
                                                }`}
                                        >
                                            {room} ({roomCounts[room] || 0}/{TOTAL_PERIODS_PER_CLASSROOM})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="card-glass rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse min-w-[1100px]">
                                    <thead>
                                        <tr>
                                            <th className="p-4 bg-white/5 border-b border-r border-white/10 text-secondary text-left w-40 tracking-wider">DAY</th>
                                            {timeSlots.map((slot) => (
                                                <th
                                                    key={slot.time}
                                                    className="p-3 bg-white/5 border-b border-r border-white/10 text-center text-secondary"
                                                >
                                                    <div className="text-xs uppercase tracking-widest">{slot.label}</div>
                                                    <div className="text-[10px] text-secondary/70">{slot.time}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {days.map((day) => (
                                            <tr key={day}>
                                                <td className="p-4 border-b border-r border-white/10 text-primary font-semibold">{day}</td>
                                                {renderDayCells(day)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default AiTimetableGenerator;
