import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
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

const TimetableView = () => {
    const [schedule, setSchedule] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [classrooms, setClassrooms] = useState([]);
    const [viewMode, setViewMode] = useState('published');
    const toast = useToast();
    const tableRef = useRef(/** @type {HTMLDivElement | null} */ (null));

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

    useEffect(() => {
        loadTimetable();
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

    const scheduleMap = useMemo(() => {
        const map = new Map();
        schedule
            .filter((entry) => entry.classroom_name === selectedRoom)
            .forEach((entry) => {
                map.set(`${entry.day_of_week}-${entry.start_time}`, entry);
            });
        return map;
    }, [schedule, selectedRoom]);

    const loadTimetable = async () => {
        try {
            const [publishedData, classroomList] = await Promise.all([
                apiFetch('/timetable'),
                apiFetch('/classrooms')
            ]);
            setClassrooms(classroomList);

            if (publishedData.length > 0) {
                setSchedule(publishedData);
                setViewMode('published');
                return;
            }

            try {
                const draftData = await apiFetch('/timetable/working');
                setSchedule(draftData);
                setViewMode(draftData.length > 0 ? 'draft' : 'published');
            } catch (_draftErr) {
                setSchedule(publishedData);
                setViewMode('published');
            }
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to load timetable');
        } finally {
            setLoading(false);
        }
    };

    const handleExportPDF = async () => {
        if (!tableRef.current) return;
        try {
            const element = tableRef.current;
            const exportNode = buildExportNode(element);
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
            pdf.text(viewMode === 'draft' ? 'LUMOGEN - Draft Timetable' : 'LUMOGEN - Published Timetable', 40, 40);
            pdf.setFontSize(10);
            pdf.text(new Date().toLocaleDateString(), pageWidth - 120, 40);

            const imgWidth = pageWidth - 80;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 40, 60, imgWidth, Math.min(imgHeight, pageHeight - 120));

            pdf.setFontSize(9);
            pdf.text('LUMOGEN Scheduler | Page 1', 40, pageHeight - 30);
            pdf.save(`LUMOGEN_${viewMode === 'draft' ? 'Draft' : 'Published'}_Timetable_${selectedRoom || 'Class'}.pdf`);
            toast.success('PDF exported');
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'PDF export failed');
        }
    };

    const handleExportExcel = () => {
        try {
            const workbook = XLSX.utils.book_new();
            const header = ['DAY', ...timeSlots.map((slot) => `${slot.label} ${slot.time}`)];
            const rows = days.map((day) => {
                const row = [day];
                timeSlots.forEach((slot) => {
                    if (slot.isBreak) {
                        row.push(slot.label);
                        return;
                    }
                    const entry = scheduleMap.get(`${day}-${slot.start}`);
                    if (!entry) {
                        row.push('');
                        return;
                    }
                    const teacher = entry.substitute_teacher_name || entry.teacher_name || '';
                    row.push(`${entry.subject_name}\n${teacher}\n${entry.classroom_name || ''}`);
                });
                return row;
            });
            const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
            const headerStyle = { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
            header.forEach((_, index) => {
                const cell = XLSX.utils.encode_cell({ r: 0, c: index });
                if (sheet[cell]) sheet[cell].s = headerStyle;
            });
            const colWidths = [{ wch: 14 }, ...timeSlots.map(() => ({ wch: 22 }))];
            sheet['!cols'] = colWidths;
            XLSX.utils.book_append_sheet(workbook, sheet, 'Timetable');
            XLSX.writeFile(workbook, `LUMOGEN_${viewMode === 'draft' ? 'Draft' : 'Published'}_Timetable_${selectedRoom || 'Class'}.xlsx`);
            toast.success('Excel exported');
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Excel export failed');
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
                <td
                    key={key}
                    colSpan={isCombinedLab ? 2 : 1}
                    className="p-2 border-b border-r border-white/10 h-24 align-top"
                >
                    {entry ? (
                        <div className="h-full flex flex-col justify-between p-2 rounded-lg border-l-4 bg-primary/10 border-primary">
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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div>
                <h1 className="text-3xl font-bold text-white">Timetable View</h1>
                <p className="text-secondary text-sm">
                    {viewMode === 'draft'
                        ? 'Generated draft timetable view. You can download it before publishing.'
                        : 'Published schedule view for classes and faculty'}
                </p>
            </div>

            <div className="card-glass p-4 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <span className="text-secondary uppercase tracking-widest text-xs">Target Class</span>
                    <div className="flex flex-wrap gap-2">
                        {rooms.map(room => (
                            <button
                                key={room}
                                onClick={() => setSelectedRoom(room)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold ${selectedRoom === room
                                    ? 'btn-primary'
                                    : 'btn-outline'
                                    }`}
                            >
                                {room}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExportPDF} className="btn-primary px-4 py-2 rounded-lg text-sm">Export PDF</button>
                    <button onClick={handleExportExcel} className="btn-outline px-4 py-2 rounded-lg text-sm">Export Excel</button>
                </div>
            </div>

            {viewMode === 'draft' && (
                <div className="card-glass p-4 rounded-xl border border-warning/30 bg-warning/5 text-sm text-secondary">
                    No published timetable exists yet. Showing the latest generated draft so you can review and download it.
                </div>
            )}

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
            )}
        </motion.div>
    );
};

export default TimetableView;
