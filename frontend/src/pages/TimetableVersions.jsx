import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { ErrorBanner, LoadingSkeleton } from '../components/ApiState';
import { useToast } from '../components/ToastProvider';

const TimetableVersions = () => {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const toast = useToast();

    const load = async () => {
        setLoading(true);
        try {
            setVersions(await apiFetch('/timetable/versions'));
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to load versions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const publish = async () => {
        await apiFetch('/timetable/publish', { method: 'POST' });
        toast.success('Current draft published');
        load();
    };

    const restore = async (id) => {
        if (!window.confirm('Restore this timetable version?')) return;
        await apiFetch(`/timetable/rollback/${id}`, { method: 'POST' });
        toast.success('Timetable restored');
        load();
    };

    if (loading) return <LoadingSkeleton rows={4} />;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-[11px] uppercase tracking-[0.34em] text-primary">Timetable</div>
                    <h1 className="mt-2 text-3xl font-black text-white">Version history</h1>
                </div>
                <button onClick={publish} className="btn-primary rounded-2xl px-5 py-3 font-semibold uppercase tracking-[0.22em]">Publish Current</button>
            </div>
            {error && <ErrorBanner message={error} onRetry={load} />}
            <div className="space-y-3">
                {versions.map((version) => (
                    <div key={version.id} className="card-glass flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] p-5">
                        <div>
                            <div className="text-sm font-semibold text-white">{version.action} | {version.scope}</div>
                            <div className="mt-1 text-sm text-secondary">{new Date(version.created_at).toLocaleString()} | {version.entry_count} entries | Author {version.actor_id || 'system'}</div>
                        </div>
                        <button onClick={() => restore(version.id)} className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">Restore</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TimetableVersions;
