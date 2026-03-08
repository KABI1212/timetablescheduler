import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '../utils/api';

const ClassroomManagement = () => {
    const [classrooms, setClassrooms] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadClassrooms();
    }, []);

    const loadClassrooms = async () => {
        try {
            const data = await apiFetch('/classrooms');
            setClassrooms(data);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            console.error("Failed to fetch classrooms", error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * @param {any} id
     */
    const handleDelete = async (id) => {
        if (!window.confirm("ARE YOU SURE YOU WANT TO DECOMMISSION THIS ASSET NODE?")) return;
        try {
            await apiFetch(`/classrooms/${id}`, { method: 'DELETE' });
            setClassrooms(classrooms.filter(c => c.id !== id));
        } catch (err) {
            const error = /** @type {Error} */ (err);
            console.error("Decommissioning failed", error);
        }
    };

    const handleAdd = async () => {
        const name = window.prompt("ENTER CLASSROOM NAME:");
        if (!name) return;
        const capacity = window.prompt("ENTER CAPACITY:");
        if (!capacity) return;

        try {
            await apiFetch('/classrooms', {
                method: 'POST',
                body: JSON.stringify({ name, capacity: parseInt(capacity) })
            });
            loadClassrooms();
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
                    Asset Management <span className="text-sm font-mono text-gray-500">[CLASSROOMS]</span>
                </h1>
                <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-neonPink text-white rounded-lg shadow-neon-pink hover:bg-neonPurple transition-all font-bold tracking-wider"
                >
                    + Add Asset
                </button>
            </div>

            <div className="glassmorphism rounded-xl overflow-hidden border border-white/10">
                {loading ? (
                    <div className="p-8 text-center text-neonCyan font-mono animate-pulse">Scanning Grid Assets...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/10 text-neonCyan font-mono">
                            <tr>
                                <th className="p-4">ID</th>
                                <th className="p-4">Name</th>
                                <th className="p-4">Capacity</th>
                                <th className="p-4">Type</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classrooms.length === 0 && (
                                <tr><td colSpan={5} className="p-4 text-center text-gray-400">No classroom assets detected in current grid sector.</td></tr>
                            )}
                            {classrooms.map((/** @type {any} */ room, /** @type {number} */ i) => (
                                <motion.tr
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    key={room.id}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    <td className="p-4 text-gray-400 font-mono">#{room.id}</td>
                                    <td className="p-4 font-semibold">{room.name}</td>
                                    <td className="p-4 text-neonCyan font-mono">{room.capacity} UNITS</td>
                                    <td className="p-4 uppercase text-xs">{room.type || 'lecture'}</td>
                                    <td className="p-4 text-right space-x-3">
                                        <button className="text-neonCyan hover:text-white transition-colors">Edit</button>
                                        <button
                                            onClick={() => handleDelete(room.id)}
                                            className="text-neonPink hover:text-white transition-colors"
                                        >
                                            Decommission
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

export default ClassroomManagement;
