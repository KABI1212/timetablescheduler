import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../utils/api';
import { useToast } from './ToastProvider';

const emptyAnalysis = {
    summary: {
        total: 0,
        hard: 0,
        soft: 0,
        error: 0,
        warning: 0,
        by_type: []
    },
    conflicts: []
};

const ConflictPanel = () => {
    const [open, setOpen] = useState(true);
    const [analysis, setAnalysis] = useState(emptyAnalysis);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    const loadConflicts = async () => {
        try {
            const data = await apiFetch('/timetable/conflicts');
            setAnalysis({
                summary: data?.summary || emptyAnalysis.summary,
                conflicts: Array.isArray(data?.conflicts) ? data.conflicts : []
            });
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

    const hardConflicts = useMemo(
        () => analysis.conflicts.filter((conflict) => conflict.level === 'hard'),
        [analysis.conflicts]
    );

    const softConflicts = useMemo(
        () => analysis.conflicts.filter((conflict) => conflict.level === 'soft'),
        [analysis.conflicts]
    );

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
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white">Conflict Dashboard</h2>
                    <p className="mt-1 text-sm text-secondary">
                        Hard constraints stay red so failed generations never disappear silently.
                    </p>
                </div>
                <button
                    onClick={() => setOpen(!open)}
                    className="btn-outline rounded-lg px-3 py-1.5 text-xs uppercase tracking-widest"
                >
                    {open ? 'Collapse' : 'Expand'}
                </button>
            </div>

            {open && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-danger/40 bg-danger/10 p-4">
                            <div className="text-xs uppercase tracking-widest text-danger">Hard Conflicts</div>
                            <div className="mt-2 text-3xl font-bold text-white">{analysis.summary.hard}</div>
                        </div>
                        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                            <div className="text-xs uppercase tracking-widest text-warning">Soft Conflicts</div>
                            <div className="mt-2 text-3xl font-bold text-white">{analysis.summary.soft}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <div className="text-xs uppercase tracking-widest text-secondary">Total Checks</div>
                            <div className="mt-2 text-3xl font-bold text-white">{analysis.summary.total}</div>
                        </div>
                    </div>

                    {loading && <div className="h-16 skeleton" />}

                    {!loading && analysis.summary.total === 0 && (
                        <div className="rounded-xl border border-success/40 bg-success/10 p-4 text-success">
                            The current draft has no detected scheduling conflicts.
                        </div>
                    )}

                    {!loading && hardConflicts.length > 0 && (
                        <div className="space-y-3">
                            {hardConflicts.map((conflict) => (
                                <div
                                    key={conflict.id}
                                    className="flex flex-col gap-3 rounded-xl border border-danger/40 bg-danger/10 p-4 md:flex-row md:items-center md:justify-between"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-white">{conflict.type}</p>
                                        <p className="mt-1 text-xs text-secondary">{conflict.details}</p>
                                    </div>
                                    <button
                                        onClick={() => handleFix(conflict.id)}
                                        className="btn-danger rounded-lg px-4 py-2 text-xs uppercase tracking-widest"
                                    >
                                        Auto Fix
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && softConflicts.length > 0 && (
                        <div className="space-y-3">
                            {softConflicts.map((conflict) => (
                                <div
                                    key={conflict.id}
                                    className="rounded-xl border border-warning/30 bg-warning/10 p-4"
                                >
                                    <p className="text-sm font-semibold text-white">{conflict.type}</p>
                                    <p className="mt-1 text-xs text-secondary">{conflict.details}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ConflictPanel;
