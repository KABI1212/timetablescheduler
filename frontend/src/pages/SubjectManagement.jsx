import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '../utils/api';

const SubjectManagement = () => {
    const [subjects, setSubjects] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        try {
            const data = await apiFetch('/subjects');
            setSubjects(data);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            console.error("Failed to fetch subjects", error);
        } finally {
            setLoading(false);
        }
    };

    /** @param {number|string} id */
    const handleDelete = async (id) => {
        if (!window.confirm("ARE YOU SURE YOU WANT TO PURGE THIS DATA MODULE?")) return;
        try {
            await apiFetch(`/subjects/${id}`, { method: 'DELETE' });
            setSubjects(subjects.filter(s => s.id !== id));
        } catch (err) {
            const error = /** @type {Error} */ (err);
            console.error("Purge failed", error);
        }
    };

    const handleAdd = async () => {
        const name = window.prompt("ENTER SUBJECT NAME:");
        if (!name) return;
        const code = window.prompt("ENTER SUBJECT CODE:");
        if (!code) return;

        try {
            await apiFetch('/subjects', {
                method: 'POST',
                body: JSON.stringify({ name, code, credits: 3 })
            });
            loadSubjects();
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
                    Core Modules <span className="text-sm font-mono text-gray-500">[SUBJECTS]</span>
                </h1>
                <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-neonPurple text-white rounded-lg shadow-neon-purple hover:bg-neonPink transition-all font-bold tracking-wider"
                >
                    + Add Module
                </button>
            </div>

            <div className="glassmorphism rounded-xl overflow-hidden border border-white/10">
                {loading ? (
                    <div className="p-8 text-center text-neonCyan font-mono animate-pulse">Syncing Curricular Modules...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/10 text-neonCyan font-mono">
                            <tr>
                                <th className="p-4">ID</th>
                                <th className="p-4">Code</th>
                                <th className="p-4">Name</th>
                                <th className="p-4">Credits</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjects.length === 0 && (
                                <tr><td colSpan={5} className="p-4 text-center text-gray-400">No data modules indexed in primary repository.</td></tr>
                            )}
                            {subjects.map((/** @type {any} */ subject, /** @type {number} */ i) => (
                                <motion.tr
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    key={subject.id}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    <td className="p-4 text-gray-400 font-mono">#{subject.id}</td>
                                    <td className="p-4 font-bold text-neonPurple">{subject.code}</td>
                                    <td className="p-4 font-semibold">{subject.name}</td>
                                    <td className="p-4 text-neonPink font-mono">{subject.credits} CR</td>
                                    <td className="p-4 text-right space-x-3">
                                        <button className="text-neonCyan hover:text-white transition-colors">Edit</button>
                                        <button
                                            onClick={() => handleDelete(subject.id)}
                                            className="text-neonPink hover:text-white transition-colors"
                                        >
                                            Purge
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

export default SubjectManagement;
