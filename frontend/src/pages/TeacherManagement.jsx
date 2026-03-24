import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useToast } from '../components/ToastProvider';

const defaultForm = {
    name: '',
    email: '',
    max_hours_per_week: '20'
};

const TeacherManagement = () => {
    const [teachers, setTeachers] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(defaultForm);
    const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
    const [editingId, setEditingId] = useState(/** @type {number | null} */ (null));
    const toast = useToast();

    useEffect(() => {
        loadTeachers();
    }, []);

    const loadTeachers = async () => {
        try {
            const data = await apiFetch('/teachers');
            setTeachers(data);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to fetch teachers');
        } finally {
            setLoading(false);
        }
    };

    const validate = () => {
        /** @type {Record<string, string>} */
        const nextErrors = {};
        if (!editingId && !form.name.trim()) nextErrors.name = 'Name is required.';
        if (!editingId && !form.email.trim()) nextErrors.email = 'Email is required.';
        if (!form.max_hours_per_week || Number.isNaN(Number(form.max_hours_per_week))) nextErrors.max_hours_per_week = 'Max hours must be a number.';
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const resetForm = () => {
        setForm(defaultForm);
        setErrors({});
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            if (editingId) {
                await apiFetch(`/teachers/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ max_hours_per_week: parseInt(form.max_hours_per_week, 10) })
                });
                toast.success('Teacher updated');
            } else {
                const regRes = await apiFetch('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: 'password123', role: 'teacher' })
                });
                await apiFetch('/teachers', {
                    method: 'POST',
                    body: JSON.stringify({ user_id: regRes.user.id, max_hours_per_week: parseInt(form.max_hours_per_week, 10) })
                });
                toast.success('Teacher added');
            }
            resetForm();
            loadTeachers();
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Save failed');
        }
    };

    const handleEdit = (teacher) => {
        setEditingId(teacher.id);
        setForm({
            name: teacher.name || '',
            email: teacher.email || '',
            max_hours_per_week: String(teacher.max_hours_per_week || 20)
        });
        setErrors({});
    };

    /** @param {any} id */
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this teacher?")) return;
        try {
            await apiFetch(`/teachers/${id}`, { method: 'DELETE' });
            toast.success('Teacher removed');
            setTeachers(teachers.filter((t) => t.id !== id));
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Delete failed');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Teachers</h1>
                <p className="text-secondary text-sm">Manage faculty profiles and workloads</p>
            </div>

            <div className="card-glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                    {editingId ? 'Edit Teacher Workload' : 'Add Teacher'}
                </h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-secondary text-sm mb-2">Name</label>
                        <input
                            disabled={Boolean(editingId)}
                            className="w-full input-quantum p-3 rounded-lg disabled:opacity-50"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-secondary text-sm mb-2">Email</label>
                        <input
                            disabled={Boolean(editingId)}
                            className="w-full input-quantum p-3 rounded-lg disabled:opacity-50"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                        {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-secondary text-sm mb-2">Max Hours/Week</label>
                        <input
                            type="number"
                            className="w-full input-quantum p-3 rounded-lg"
                            value={form.max_hours_per_week}
                            onChange={(e) => setForm({ ...form, max_hours_per_week: e.target.value })}
                        />
                        {errors.max_hours_per_week && <p className="text-danger text-xs mt-1">{errors.max_hours_per_week}</p>}
                    </div>
                    <div className="md:col-span-1 flex items-end gap-3">
                        <button type="submit" className="btn-primary px-6 py-3 rounded-lg font-semibold">
                            {editingId ? 'Update' : 'Add'}
                        </button>
                        {editingId && (
                            <button type="button" onClick={resetForm} className="btn-outline px-4 py-3 rounded-lg text-sm">
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="card-glass rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-8">
                        <div className="h-10 skeleton mb-4" />
                        <div className="h-10 skeleton mb-4" />
                        <div className="h-10 skeleton" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left">
                            <thead className="bg-white/5 border-b border-white/10 text-secondary">
                                <tr>
                                    <th className="p-4">ID</th>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Max Hours/Week</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teachers.length === 0 && (
                                    <tr><td colSpan={5} className="p-4 text-center text-secondary">No teachers found.</td></tr>
                                )}
                                {teachers.map((teacher) => (
                                    <tr key={teacher.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-secondary">#{teacher.id}</td>
                                        <td className="p-4 text-white">{teacher.name}</td>
                                        <td className="p-4 text-secondary">{teacher.email}</td>
                                        <td className="p-4 text-secondary">{teacher.max_hours_per_week}H</td>
                                        <td className="p-4 text-right space-x-3">
                                            <button onClick={() => handleEdit(teacher)} className="btn-outline px-3 py-1 rounded text-xs">Edit</button>
                                            <button
                                                onClick={() => handleDelete(teacher.id)}
                                                className="btn-danger px-3 py-1 rounded text-xs"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherManagement;
