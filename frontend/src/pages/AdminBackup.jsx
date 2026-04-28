import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { ErrorBanner, LoadingSkeleton } from '../components/ApiState';
import { useToast } from '../components/ToastProvider';

const AdminBackup = () => {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const toast = useToast();

    const load = async () => {
        setLoading(true);
        try {
            setBackups(await apiFetch('/admin/backups'));
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to load backups');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const create = async () => {
        await apiFetch('/admin/backup', { method: 'POST' });
        toast.success('Backup created');
        load();
    };

    const restore = async (filename) => {
        if (!window.confirm(`Restore ${filename}?`)) return;
        await apiFetch('/admin/restore', {
            method: 'POST',
            body: JSON.stringify({ filename })
        });
        toast.success('Backup restored');
        load();
    };

    if (loading) return <LoadingSkeleton rows={4} />;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-[11px] uppercase tracking-[0.34em] text-primary">Admin</div>
                    <h1 className="mt-2 text-3xl font-black text-white">Database backups</h1>
                </div>
                <button onClick={create} className="btn-primary rounded-2xl px-5 py-3 font-semibold uppercase tracking-[0.22em]">Create Backup</button>
            </div>
            {error && <ErrorBanner message={error} onRetry={load} />}
            <div className="space-y-3">
                {backups.map((backup) => (
                    <div key={backup.filename} className="card-glass flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] p-5">
                        <div>
                            <div className="text-sm font-semibold text-white">{backup.filename}</div>
                            <div className="mt-1 text-sm text-secondary">{new Date(backup.modified_at).toLocaleString()} | {backup.size} bytes</div>
                        </div>
                        <button onClick={() => restore(backup.filename)} className="rounded-2xl border border-warning/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">Restore</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminBackup;
