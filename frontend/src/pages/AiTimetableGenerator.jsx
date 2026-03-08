import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '../utils/api';
import html2pdf from 'html2pdf.js';

const AiTimetableGenerator = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    /** @type {[any, any]} */
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedRoom, setSelectedRoom] = useState('');

    useEffect(() => {
        loadTimetable();
    }, []);

    useEffect(() => {
        if (schedule.length > 0 && !selectedRoom) {
            setSelectedRoom(schedule[0].classroom_name);
        }
    }, [schedule]);

    const rooms = [...new Set(schedule.map((/** @type {any} */ s) => s.classroom_name))];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = [
        { name: 'P1', time: '09:15 - 10:00', key: '09:15' },
        { name: 'P2', time: '10:00 - 10:45', key: '10:00' },
        { name: 'BREAK', time: '10:45 - 11:00', isBreak: true },
        { name: 'P3', time: '11:00 - 11:45', key: '11:00' },
        { name: 'P4', time: '11:45 - 12:30', key: '11:45' },
        { name: 'LUNCH', time: '12:30 - 01:20', isBreak: true },
        { name: 'P5', time: '01:20 - 02:05', key: '13:20' },
        { name: 'P6', time: '02:06 - 02:50', key: '14:05' },
        { name: 'BREAK', time: '02:51 - 03:05', isBreak: true },
        { name: 'P7', time: '03:06 - 03:50', key: '15:05' },
        { name: 'P8', time: '03:51 - 04:40', key: '15:55' }
    ];

    const getSlot = (/** @type {string} */ day, /** @type {string} */ key) => {
        return schedule.find((/** @type {any} */ s) =>
            s.classroom_name === selectedRoom &&
            s.day_of_week === day &&
            s.start_time.startsWith(key)
        );
    };

    const loadTimetable = async () => {
        try {
            const data = await apiFetch('/timetable');
            setSchedule(data);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            console.error("Failed to fetch timetable", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setProgress(0);

        let localProgress = 0;
        const interval = setInterval(() => {
            localProgress += Math.floor(Math.random() * 15);
            if (localProgress > 95) localProgress = 95;
            setProgress(localProgress);
        }, 300);

        try {
            await apiFetch('/timetable/generate', { method: 'POST' });
            clearInterval(interval);
            setProgress(100);
            await loadTimetable();
        } catch (err) {
            const error = /** @type {Error} */ (err);
            clearInterval(interval);
            alert('Failed to generate: ' + error.message);
            setProgress(0);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadPDF = () => {
        const element = document.getElementById('timetable-container');
        if (!element) return;

        // Temporarily apply printable black & white styles
        element.classList.add('pdf-export-mode');

        const opt = {
            margin: 0.2,
            filename: `Timetable_${selectedRoom}.pdf`,
            image: { type: /** @type {"jpeg"} */ ('jpeg'), quality: 1 },
            html2canvas: {
                scale: 2,
                windowWidth: 1600 // Increased virtual width to give table plenty of room
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
            jsPDF: { unit: 'in', format: 'a3', orientation: /** @type {"landscape"} */ ('landscape') }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            // Remove printable styles after PDF is generated
            element.classList.remove('pdf-export-mode');
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto space-y-8"
        >
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neonPink to-neonPurple shadow-neon-purple p-2">
                    Autonomous Timetable Core
                </h1>
                <p className="text-gray-400 font-mono italic">"Temporal Optimization through Genetic Algorithms"</p>
            </div>

            <div className="glassmorphism p-8 rounded-2xl border border-neonPurple/50 shadow-neon-purple text-center space-y-6">
                <div className="h-4 bg-cyberBlack rounded-full overflow-hidden border border-white/10 relative">
                    <motion.div
                        className="h-full bg-gradient-to-r from-neonCyan to-neonPurple"
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: "linear" }}
                    />
                </div>

                <div className="flex items-center justify-center gap-6">
                    <p className="font-mono text-neonCyan">
                        {isGenerating ? `Processing Generative Algorithm [${progress}%]` : "Awaiting Command..."}
                    </p>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={`px-8 py-3 rounded-xl font-bold tracking-widest uppercase transition-all ${isGenerating
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            : 'bg-neonPurple text-white shadow-neon-purple hover:bg-neonPink hover:shadow-neon-pink'
                            }`}
                    >
                        {isGenerating ? 'Computing...' : 'Initialize AI Engine'}
                    </motion.button>
                </div>
            </div>

            {(schedule.length > 0) && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <div className="flex justify-between items-center bg-cyberBlack/50 p-4 rounded-xl border border-neonCyan/30">
                        <div className="flex gap-4 items-center">
                            <span className="text-neonCyan font-mono uppercase tracking-tighter text-sm">Target Class:</span>
                            <div className="flex gap-2">
                                {rooms.map(room => (
                                    <button
                                        key={room}
                                        onClick={() => setSelectedRoom(room)}
                                        className={`px-4 py-1.5 rounded-lg border transition-all text-sm font-bold ${selectedRoom === room
                                            ? 'bg-neonCyan text-black border-neonCyan shadow-neon-cyan'
                                            : 'border-white/20 text-white hover:border-neonCyan/50'
                                            }`}
                                    >
                                        {room}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-neonCyan font-mono text-sm border border-neonCyan/20 px-4 py-1.5 rounded-full">
                                [ {schedule.length} TOTAL BLOCKS ]
                            </div>
                            <button
                                onClick={handleDownloadPDF}
                                className="px-4 py-1.5 rounded-lg border border-neonPurple text-neonPurple hover:bg-neonPurple hover:text-white transition-all text-sm font-bold shadow-neon-purple"
                            >
                                Download PDF
                            </button>
                        </div>
                    </div>

                    <div id="timetable-container" className="glassmorphism rounded-2xl border border-white/10 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-4 bg-white/5 border-b border-r border-white/10 text-neonPurple font-mono text-left w-32 tracking-wider">DAY \ TIME</th>
                                        {periods.map(p => (
                                            <th key={p.time} className={`p-4 bg-white/5 border-b border-r border-white/10 text-center min-w-[140px] ${p.isBreak ? 'text-gray-500 italic text-xs' : 'text-neonCyan'}`}>
                                                <div className="font-bold text-sm">{p.name}</div>
                                                <div className="text-[10px] opacity-60 font-mono tracking-tighter">{p.time}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {days.map(day => (
                                        <tr key={day}>
                                            <td className="p-4 border-b border-r border-white/10 font-bold text-white bg-white/5">{day}</td>
                                            {periods.map(p => {
                                                if (p.isBreak) {
                                                    return (
                                                        <td key={p.time} className="p-4 border-b border-r border-white/10 bg-cyberBlack/80 text-center text-[10px] text-gray-600 font-mono uppercase tracking-widest break-words vertical-text">
                                                            {p.name}
                                                        </td>
                                                    );
                                                }
                                                const slot = p.key ? getSlot(day, p.key) : null;
                                                return (
                                                    <td key={p.time} className="p-2 border-b border-r border-white/10 h-28 group relative">
                                                        {slot ? (
                                                            <motion.div
                                                                initial={{ scale: 0.9, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                className="h-full flex flex-col justify-between bg-neonPurple/10 border-l-4 border-neonPurple p-2 rounded-r-lg group-hover:bg-neonPurple/20 transition-all shadow-lg shadow-neonPurple/5"
                                                            >
                                                                <div className="font-bold text-white text-xs leading-tight whitespace-normal break-words">{slot.subject_name}</div>
                                                                <div className="mt-1 text-[11px] text-gray-400 font-mono flex items-center gap-1">
                                                                    <span className="opacity-50 text-[8px] tracking-tighter">PROF:</span> {slot.teacher_name}
                                                                </div>
                                                                <div className="mt-auto pt-2 text-[9px] text-right font-bold text-neonPurple uppercase tracking-widest opacity-80">{slot.classroom_name}</div>
                                                            </motion.div>
                                                        ) : (
                                                            <div className="h-full border border-dashed border-white/5 rounded-lg flex items-center justify-center opacity-20">
                                                                <span className="text-[10px] font-mono">VACANT</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default AiTimetableGenerator;
