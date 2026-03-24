import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../utils/api';
import { buildICalendar, downloadCalendarFile } from '../utils/calendar';
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

const palette = ['#F4C430', '#38D9FF', '#FF4D4D', '#2AD66B', '#FFE8A3'];

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

const buildExportNode = (node) => {
    const clone = node.cloneNode(true);
    clone.style.background = '#ffffff';
    clone.style.color = '#000000';
    clone.style.boxShadow = 'none';
    clone.style.border = '1px solid #000000';
    clone.querySelectorAll('*').forEach((el) => {
        el.style.color = '#000000';
        el.style.background = 'transparent';
        el.style.boxShadow = 'none';
        el.style.textShadow = 'none';
        el.style.borderColor = '#000000';
    });
    return clone;
};

const StudentTimetable = () => {
    const [schedule, setSchedule] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(true);
    const [classId, setClassId] = useState('');
    const toast = useToast();
    const tableRef = useRef(/** @type {HTMLDivElement | null} */ (null));

    const userRaw = localStorage.getItem('chrono_user');
    const user = userRaw ? JSON.parse(userRaw) : null;

    useEffect(() => {
        if (user?.class_id) {
            setClassId(String(user.class_id));
            return;
        }
        if (user?.classId) {
            setClassId(String(user.classId));
        }
    }, []);

    useEffect(() => {
        if (!classId) {
            const loadDefaultClass = async () => {
                try {
                    const rooms = await apiFetch('/classrooms');
                    if (rooms && rooms.length > 0) {
                        setClassId(String(rooms[0].id));
                    }
                } catch (err) {
                    const error = /** @type {Error} */ (err);
                    toast.error(error.message || 'Failed to load classes');
                }
            };
            loadDefaultClass();
            return;
        }
        const load = async () => {
            setLoading(true);
            try {
                const data = await apiFetch(`/timetable/student/${classId}`);
                setSchedule(data);
            } catch (err) {
                const error = /** @type {Error} */ (err);
                toast.error(error.message || 'Failed to load timetable');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [classId, toast]);

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const scheduleMap = useMemo(() => {
        const map = new Map();
        schedule.forEach((entry) => {
            map.set(`${entry.day_of_week}-${entry.start_time}`, entry);
        });
        return map;
    }, [schedule]);

    const subjectColors = useMemo(() => {
        const map = new Map();
        schedule.forEach((entry) => {
            if (!map.has(entry.subject_name)) {
                map.set(entry.subject_name, palette[map.size % palette.length]);
            }
        });
        return map;
    }, [schedule]);

    const handleExportPDF = async () => {
        if (!tableRef.current) return;
        try {
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import('html2canvas'),
                import('jspdf')
            ]);
            const exportNode = buildExportNode(tableRef.current);
            exportNode.style.position = 'fixed';
            exportNode.style.left = '-10000px';
            exportNode.style.top = '0';
            document.body.appendChild(exportNode);
            const canvas = await html2canvas(exportNode, { scale: 2, backgroundColor: '#ffffff' });
            document.body.removeChild(exportNode);
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            pdf.setFontSize(16);
            pdf.text('ChronoCampus - My Timetable', 40, 40);
            pdf.setFontSize(10);
            pdf.text(new Date().toLocaleDateString(), pageWidth - 120, 40);

            const imgWidth = pageWidth - 80;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 40, 60, imgWidth, Math.min(imgHeight, pageHeight - 120));
            pdf.save('ChronoCampus_My_Timetable.pdf');
            toast.success('PDF exported');
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'PDF export failed');
        }
    };

    const handleExportICal = () => {
        try {
            const content = buildICalendar(schedule, {
                calendarName: `${user?.name || 'Student'} Timetable`
            });
            downloadCalendarFile('ChronoCampus_My_Timetable.ics', content);
            toast.success('iCal exported');
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'iCal export failed');
        }
    };

    const renderDayCells = (day, isToday) => {
        const cells = [];
        for (let index = 0; index < timeSlots.length; index += 1) {
            const slot = timeSlots[index];
            if (slot.isBreak) {
                cells.push(
                    <td
                        key={`${day}-${slot.time}-break`}
                        className={`p-2 border-b border-r border-white/10 text-center text-[10px] uppercase tracking-widest bg-break text-secondary ${isToday ? 'border-primary/60 shadow-blue-glow' : ''}`}
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
            const color = entry ? subjectColors.get(entry.subject_name) : null;
            const baseColor = color || '#00B4FF';
            const backgroundColor = `${baseColor}1a`;

            cells.push(
                <td
                    key={key}
                    colSpan={isCombinedLab ? 2 : 1}
                    className={`p-2 border-b border-r border-white/10 h-24 align-top ${isToday ? 'border-primary/60 shadow-blue-glow' : ''}`}
                >
                    {entry ? (
                        <div
                            className="h-full flex flex-col justify-between p-2 rounded-lg border-l-4"
                            style={{ borderColor: baseColor, background: backgroundColor }}
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
                                {entry.substitute_teacher_name && (
                                    <span className="ml-2 text-warning text-[10px] font-semibold">SUB</span>
                                )}
                            </div>
                            <div className="mt-auto pt-2 text-[10px] text-right font-semibold text-secondary uppercase tracking-widest">
                                {entry.classroom_name}
                            </div>
                        </div>
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">My Timetable</h1>
                    <p className="text-secondary text-sm">Class schedule overview</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={handleExportPDF} className="btn-primary px-4 py-2 rounded-lg text-sm">
                        Export PDF
                    </button>
                    <button onClick={handleExportICal} className="btn-outline px-4 py-2 rounded-lg text-sm">
                        Export iCal
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-64 skeleton" />
            ) : (
                <div className="card-glass rounded-2xl overflow-hidden" ref={tableRef}>
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
                                {days.map((day) => {
                                    const isToday = day === today;
                                    return (
                                        <tr key={day}>
                                            <td className={`p-4 border-b border-r border-white/10 text-primary font-semibold ${isToday ? 'border-primary/60 shadow-blue-glow' : ''}`}>
                                                {day}
                                            </td>
                                            {renderDayCells(day, isToday)}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentTimetable;
