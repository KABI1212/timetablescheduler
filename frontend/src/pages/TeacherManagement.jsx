import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '../utils/api';

const TeacherManagement = () => {
    /** @type {[any, any]} */
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTeachers();
    }, []);

    const loadTeachers = async () => {
        try {
            const data = await apiFetch('/teachers');
            setTeachers(data);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            console.error("Failed to fetch personnel", error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * @param {any} id
     */
    const handleDelete = async (id) => {
        if (!window.confirm("ARE YOU SURE YOU WANT TO TERMINATE THIS PERSONNEL LINK?")) return;
        try {
            await apiFetch(`/teachers/${id}`, { method: 'DELETE' });
            setTeachers(teachers.filter((/** @type {any} */ t) => t.id !== id));
        } catch (err) {
            const error = /** @type {Error} */ (err);
            console.error("Termination failed", error);
            alert("SYSTEM ERROR: Termination sequence aborted.");
        }
    };

    const handleAdd = async () => {
        const name = window.prompt("ENTER PERSONNEL NAME:");
        if (!name) return;
        const email = window.prompt("ENTER CONTACT EMAIL:");
        if (!email) return;

        try {
            // First, register the teacher as a user to get a valid user_id
            const regRes = await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name, email, password: 'password123', role: 'teacher' })
            });

            // Then link the new user as a teacher
            await apiFetch('/teachers', {
                method: 'POST',
                body: JSON.stringify({ user_id: regRes.user.id, max_hours_per_week: 20 })
            });
            loadTeachers();
            alert("PERSONNEL INTEGRATED SUCCESSFULLY.");
        } catch (err) {
            const error = /** @type {Error} */ (err);
            console.error("Integration failed", error);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-neonCyan drop-shadow-sm">
                    Teacher Personnel
                </h1>
                <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-neonPurple text-white rounded-lg shadow-neon-purple hover:bg-neonPink hover:shadow-neon-pink transition-all font-bold tracking-wider"
                >
                    + Add Personnel
                </button>
            </div>

            <div className="glassmorphism rounded-xl overflow-hidden border border-white/10">
                {loading ? (
                    <div className="p-8 text-center text-neonCyan font-mono animate-pulse">Syncing Personnel Data...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/10 text-neonCyan font-mono">
                            <tr>
                                <th className="p-4">ID</th>
                                <th className="p-4">Name</th>
                                <th className="p-4">Email Contact</th>
                                <th className="p-4">Max Hours/Week</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.length === 0 && (
                                <tr><td colSpan={5} className="p-4 text-center text-gray-400">No personnel records found in core database.</td></tr>
                            )}
                            {teachers.map((/** @type {any} */ teacher, /** @type {number} */ i) => (
                                <motion.tr
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    key={teacher.id}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    <td className="p-4 text-gray-400 font-mono">#{teacher.id}</td>
                                    <td className="p-4 font-semibold">{teacher.name}</td>
                                    <td className="p-4 text-gray-300">{teacher.email}</td>
                                    <td className="p-4 text-neonPink font-mono">{teacher.max_hours_per_week}H</td>
                                    <td className="p-4 text-right space-x-3">
                                        <button className="text-neonCyan hover:text-white transition-colors">Edit</button>
                                        <button
                                            onClick={() => handleDelete(teacher.id)}
                                            className="text-neonPink hover:text-white transition-colors"
                                        >
                                            Terminate
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </motion.div>
    );
};

export default TeacherManagement;
