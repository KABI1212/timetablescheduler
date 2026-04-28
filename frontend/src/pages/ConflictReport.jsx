import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../utils/api';
import { ErrorBanner, LoadingSkeleton } from '../components/ApiState';
import { useToast } from '../components/ToastProvider';

const ConflictReport = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const toast = useToast();

    const load = async () => {
        setLoading(true);
        try {
            setReport(await apiFetch('/timetable/validate-conflicts'));
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to validate conflicts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const grouped = useMemo(() => {
        const map = {};
        (report?.conflicts || []).forEach((conflict) => {
            map[conflict.type] = [...(map[conflict.type] || []), conflict];
        });
        return map;
    }, [report]);

    const autoFix = async (conflict) => {
        await apiFetch('/timetable/conflicts/fix', {
            method: 'POST',
            body: JSON.stringify({ conflictId: conflict.id })
        });
        toast.success('Auto-fix attempted');
        load();
    };

    if (loading) return <LoadingSkeleton rows={4} />;

    return (
        <div className="space-y-6">
            <div>
                <div className="text-[11px] uppercase tracking-[0.34em] text-primary">Validation</div>
                <h1 className="mt-2 text-3xl font-black text-white">Conflict report</h1>
            </div>
            {error && <ErrorBanner message={error} onRetry={load} />}
            {!report?.hasConflicts && <div className="card-glass rounded-[1.6rem] p-6 text-success">No conflicts found.</div>}
            {Object.entries(grouped).map(([type, conflicts]) => (
                <section key={type} className="card-glass rounded-[1.8rem] p-5">
                    <h2 className="text-xl font-bold text-white">{type}</h2>
                    <div className="mt-4 space-y-3">
                        {conflicts.map((conflict, index) => (
                            <div key={`${type}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                                <p className="text-sm text-white">{conflict.description}</p>
                                <p className="mt-2 text-xs text-secondary">{conflict.day_of_week} | {conflict.start_time} | Teacher {conflict.teacher_id || '-'} | Room {conflict.classroom_id || '-'}</p>
                                <p className="mt-2 text-xs text-primary">Suggestion: move the affected slot, change room, or regenerate the conflicted placement.</p>
                                <button onClick={() => autoFix(conflict)} className="mt-3 rounded-xl border border-primary/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">Auto-fix</button>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default ConflictReport;
