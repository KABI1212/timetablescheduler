import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { useToast } from '../components/ToastProvider';

const getUser = () => {
    try {
        return JSON.parse(localStorage.getItem('chrono_user') || '{}');
    } catch {
        return {};
    }
};

const Profile = () => {
    const user = getUser();
    const toast = useToast();
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [saving, setSaving] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        if (form.newPassword !== form.confirm) {
            toast.error('New passwords do not match');
            return;
        }
        setSaving(true);
        try {
            await apiFetch('/auth/change-password', {
                method: 'PUT',
                body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword })
            });
            toast.success('Password changed');
            setForm({ currentPassword: '', newPassword: '', confirm: '' });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Unable to change password');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <section className="card-glass rounded-[2rem] p-6">
                <div className="text-[11px] uppercase tracking-[0.34em] text-primary">Profile</div>
                <h1 className="mt-3 text-3xl font-black text-white">{user.name || 'User'}</h1>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-secondary">{user.email}</div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm uppercase tracking-[0.2em] text-secondary">{user.role}</div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-secondary">ID {user.id}</div>
                </div>
            </section>
            <form onSubmit={submit} className="card-glass max-w-xl space-y-4 rounded-[2rem] p-6">
                <h2 className="text-xl font-bold text-white">Change password</h2>
                {['currentPassword', 'newPassword', 'confirm'].map((field) => (
                    <input
                        key={field}
                        type="password"
                        className="input-quantum w-full rounded-2xl p-4"
                        placeholder={field === 'currentPassword' ? 'Current password' : field === 'newPassword' ? 'New password' : 'Confirm new password'}
                        value={form[field]}
                        onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                    />
                ))}
                <button disabled={saving} className="btn-primary rounded-2xl px-5 py-3 font-semibold uppercase tracking-[0.24em]">
                    {saving ? 'Saving...' : 'Update Password'}
                </button>
            </form>
        </div>
    );
};

export default Profile;
