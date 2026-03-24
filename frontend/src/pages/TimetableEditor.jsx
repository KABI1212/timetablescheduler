// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { DndContext, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';
import { apiFetch } from '../utils/api';
import { useToast } from '../components/ToastProvider';

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

const DraggableEntry = ({ entry, locked, pairedEntryId, sessionLabel }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: entry.id,
        data: { entry, pairedEntryId: pairedEntryId || null },
        disabled: locked
    });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`h-full flex flex-col justify-between p-2 rounded-lg border-l-4 bg-primary/10 border-primary ${isDragging ? 'opacity-70' : ''}`}
        >
            <div className="font-bold text-white text-xs leading-tight">
                {entry.subject_name}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-secondary">
                {sessionLabel || (entry.session_type === 'lab' ? 'Lab Period' : 'Theory Period')}
            </div>
            <div className="mt-1 text-[11px] text-secondary flex items-center gap-1">
                <span className="opacity-70 text-[9px] tracking-tighter">PROF:</span> {entry.teacher_name}
            </div>
            <div className="mt-auto pt-2 text-[10px] text-right font-semibold text-secondary uppercase tracking-widest">
                {entry.classroom_name}
            </div>
        </div>
    );
};

const DroppableCell = ({ id, children, rowSpan = 1 }) => {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <td
            ref={setNodeRef}
            rowSpan={rowSpan}
            className={`p-2 border-b border-r border-white/10 h-24 align-top ${isOver ? 'bg-primary/10' : ''}`}
        >
            {children}
        </td>
    );
};

const TimetableEditor = () => {
    const [schedule, setSchedule] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [classrooms, setClassrooms] = useState([]);
    const [lockedSlots, setLockedSlots] = useState(() => new Set());
    const [status, setStatus] = useState(null);
    const [publishing, setPublishing] = useState(false);
    const toast = useToast();

    const rooms = useMemo(
        () => classrooms.map((room) => room.name),
        [classrooms]
    );

    const roomCounts = useMemo(() => schedule.reduce((acc, entry) => {
        const roomName = entry.classroom_name;
        acc[roomName] = (acc[roomName] || 0) + 1;
        return acc;
    }, /** @type {Record<string, number>} */ ({})), [schedule]);

    useEffect(() => {
        loadSchedule();
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

    const scheduleMap = useMemo(() => {
        const map = new Map();
        schedule
            .filter((entry) => entry.classroom_name === selectedRoom)
            .forEach((entry) => {
                map.set(`${entry.day_of_week}-${entry.start_time}`, entry);
            });
        return map;
    }, [schedule, selectedRoom]);

    const loadSchedule = async () => {
        try {
            const [draftSchedule, workflowStatus, classroomList] = await Promise.all([
                apiFetch('/timetable/working'),
                apiFetch('/timetable/status'),
                apiFetch('/classrooms')
            ]);
            setSchedule(draftSchedule);
            setStatus(workflowStatus);
            setClassrooms(classroomList);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to load timetable');
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const entry = active.data.current?.entry;
        if (!entry) return;

        const pairedEntryId = active.data.current?.pairedEntryId || null;
        const blockedIds = [entry.id, pairedEntryId].filter(Boolean);
        if (blockedIds.some((id) => lockedSlots.has(id))) {
            toast.error('This slot is locked');
            return;
        }

        const [targetDay, targetStart] = String(over.id).split('|');
        if (!targetDay || !targetStart) return;

        try {
            const data = await apiFetch('/timetable/validate-swap', {
                method: 'POST',
                body: JSON.stringify({
                    entry_id: entry.id,
                    target_day: targetDay,
                    target_start_time: targetStart,
                    paired_entry_id: pairedEntryId
                })
            });
            setSchedule(data);
            toast.success('Timetable updated');
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Swap invalid');
        }
    };

    const toggleLock = (entryIds) => {
        const ids = Array.isArray(entryIds) ? entryIds : [entryIds];
        setLockedSlots((prev) => {
            const next = new Set(prev);
            const shouldUnlock = ids.every((id) => next.has(id));
            if (shouldUnlock) {
                ids.forEach((id) => next.delete(id));
            } else {
                ids.forEach((id) => next.add(id));
            }
            return next;
        });
    };

    const saveLayout = async () => {
        try {
            await apiFetch('/timetable/save-layout', {
                method: 'POST',
                body: JSON.stringify({ schedule })
            });
            toast.success('Layout saved');
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Save failed');
        }
    };

    const publishLayout = async () => {
        setPublishing(true);
        try {
            await apiFetch('/timetable/publish', { method: 'POST' });
            toast.success('Draft published');
            loadSchedule();
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Publish failed');
        } finally {
            setPublishing(false);
        }
    };

    const resetLayout = async () => {
        try {
            await apiFetch('/timetable/reset', { method: 'POST' });
            toast.success('Reset to AI generated timetable');
            loadSchedule();
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Reset failed');
        }
    };

    if (loading) {
        return <div className="h-64 skeleton" />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Timetable Editor</h1>
                    <p className="text-secondary text-sm">Drag and drop the draft schedule before publishing</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={publishLayout}
                        disabled={publishing || !status?.has_draft}
                        className={`px-4 py-2 rounded-lg text-sm ${publishing || !status?.has_draft
                            ? 'btn-outline opacity-60 cursor-not-allowed'
                            : 'btn-primary'
                            }`}
                    >
                        {publishing ? 'Publishing...' : 'Publish Draft'}
                    </button>
                    <button onClick={saveLayout} className="btn-primary px-4 py-2 rounded-lg text-sm">Save Layout</button>
                    <button onClick={resetLayout} className="btn-outline px-4 py-2 rounded-lg text-sm">Reset to AI Generated</button>
                </div>
            </div>

            <div className="card-glass p-4 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-secondary">
                    Draft entries: <span className="text-white font-semibold">{status?.draft_entry_count || 0}</span>
                </div>
                <div className="text-sm text-secondary">
                    Published entries: <span className="text-white font-semibold">{status?.published_entry_count || 0}</span>
                </div>
            </div>

            <div className="card-glass p-4 rounded-xl flex flex-wrap gap-3 items-center">
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

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="card-glass rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[900px]">
                            <thead>
                                <tr>
                                    <th className="p-4 bg-white/5 border-b border-r border-white/10 text-secondary text-left w-40 tracking-wider">TIME</th>
                                    {days.map((day) => (
                                        <th key={day} className="p-4 bg-white/5 border-b border-r border-white/10 text-center text-primary">
                                            <div className="font-bold text-sm">{day}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const skippedCells = new Set();
                                    return timeSlots.map((slot, slotIndex) => {
                                        if (slot.isBreak) {
                                            return (
                                                <tr key={slot.time}>
                                                    <td className="p-4 border-b border-r border-white/10 text-secondary font-semibold">{slot.time}</td>
                                                    <td
                                                        colSpan={days.length}
                                                        className="p-3 border-b border-white/10 text-center text-xs uppercase tracking-widest bg-break text-secondary"
                                                    >
                                                        {slot.label}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={slot.time}>
                                                <td className="p-4 border-b border-r border-white/10 text-secondary">
                                                    <div className="text-xs uppercase tracking-widest">{slot.label}</div>
                                                    <div className="text-[10px] text-secondary/70">{slot.time}</div>
                                                </td>
                                                {days.map((day) => {
                                                    const cellKey = `${day}-${slot.start}`;
                                                    if (skippedCells.has(cellKey)) {
                                                        return null;
                                                    }

                                                    const cellId = `${day}|${slot.start}`;
                                                    const entry = scheduleMap.get(cellKey);
                                                    const nextIndex = getNextTeachingSlotIndex(slotIndex);
                                                    const nextSlot = nextIndex >= 0 ? timeSlots[nextIndex] : null;
                                                    const nextEntry = nextSlot ? scheduleMap.get(`${day}-${nextSlot.start}`) : null;
                                                    const isCombinedLab = isSameLabBlock(entry, nextEntry);

                                                    if (isCombinedLab && nextSlot) {
                                                        skippedCells.add(`${day}-${nextSlot.start}`);
                                                    }

                                                    const entryIds = [entry?.id, nextEntry?.id].filter(Boolean);
                                                    const locked = entryIds.some((id) => lockedSlots.has(id));

                                                    return (
                                                        <DroppableCell key={cellId} id={cellId} rowSpan={isCombinedLab ? 2 : 1}>
                                                            {entry ? (
                                                                <div className="relative h-full">
                                                                    <DraggableEntry
                                                                        entry={entry}
                                                                        locked={locked}
                                                                        pairedEntryId={isCombinedLab ? nextEntry?.id : null}
                                                                        sessionLabel={isCombinedLab ? `Lab Period ${slot.label}-${nextSlot?.label || ''}` : undefined}
                                                                    />
                                                                    <button
                                                                        onClick={() => toggleLock(entryIds)}
                                                                        className="absolute top-1 right-1 text-[10px] px-2 py-1 rounded btn-outline"
                                                                    >
                                                                        {locked ? 'Locked' : 'Lock'}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="h-full border border-dashed border-white/10 rounded-lg flex items-center justify-center text-[10px] text-secondary/50">
                                                                    Drop here
                                                                </div>
                                                            )}
                                                        </DroppableCell>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </DndContext>
        </div>
    );
};

export default TimetableEditor;
