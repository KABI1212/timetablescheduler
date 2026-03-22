import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '../utils/api';
import { useToast } from './ToastProvider';

const ConflictPanel = () => {
    const [open, setOpen] = useState(true);
    const [conflicts, setConflicts] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const loadConflicts = async () => {
        try {
            const data = await apiFetch('/timetable/conflicts');
            setConflicts(data);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to load conflicts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConflicts();
        const interval = setInterval(loadConflicts, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleFix = async (conflictId) => {
        try {
            await apiFetch('/timetable/conflicts/fix', {
                method: 'POST',
                body: JSON.stringify({ conflictId })
            });
            toast.success('Auto-fix applied');
            loadConflicts();
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Auto-fix failed');
        }
    };

    return (
        <div className="card-glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Draft Conflict Panel</h2>
                <button
                    onClick={() => setOpen(!open)}
                    className="btn-outline px-3 py-1.5 rounded-lg text-xs uppercase tracking-widest"
                >
                    {open ? 'Collapse' : 'Expand'}
                </button>
            </div>
            {open && (
                <div className="space-y-4">
                    {loading && <div className="h-16 skeleton" />}
                    {!loading && conflicts.length === 0 && (
                        <div className="p-4 rounded-xl border border-success/40 bg-success/10 text-success shadow-success-glow">
                            No conflicts found.
                        </div>
                    )}
                    {!loading && conflicts.map((conflict) => (
                        <motion.div
                            key={conflict.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl border border-danger/40 bg-danger/10 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-danger-glow"
                        >
                            <div>
                                <p className="text-sm font-semibold">{conflict.type}</p>
                                <p className="text-xs text-secondary mt-1">{conflict.details}</p>
                            </div>
                            <button
                                onClick={() => handleFix(conflict.id)}
                                className="btn-danger px-4 py-2 rounded-lg text-xs uppercase tracking-widest"
                            >
                                Auto Fix
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ConflictPanel;
