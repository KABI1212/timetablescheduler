// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useToast } from '../components/ToastProvider';

const defaultForm = {
    name: '',
    capacity: '30',
    type: 'lecture',
    is_lab: false,
    maintenance_mode: false,
    maintenance_note: ''
};

const ClassroomManagement = () => {
    const [classrooms, setClassrooms] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(defaultForm);
    const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
    const [editingId, setEditingId] = useState(/** @type {number | null} */ (null));
    const toast = useToast();

    useEffect(() => {
        loadClassrooms();
    }, []);

    const loadClassrooms = async () => {
        try {
            const data = await apiFetch('/classrooms');
            setClassrooms(data);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to fetch classrooms');
        } finally {
            setLoading(false);
        }
    };

    const validate = () => {
        /** @type {Record<string, string>} */
        const nextErrors = {};
        if (!form.name.trim()) nextErrors.name = 'Classroom name is required.';
        if (!form.capacity || Number.isNaN(Number(form.capacity))) nextErrors.capacity = 'Capacity must be a number.';
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
            const payload = {
                name: form.name.trim(),
                capacity: parseInt(form.capacity, 10),
                type: form.type,
                is_lab: form.is_lab,
                maintenance_mode: form.maintenance_mode,
                maintenance_note: form.maintenance_mode ? form.maintenance_note.trim() : ''
            };
            if (editingId) {
                await apiFetch(`/classrooms/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                toast.success('Classroom updated');
            } else {
                await apiFetch('/classrooms', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                toast.success('Classroom added');
            }
            resetForm();
            loadClassrooms();
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Save failed');
        }
    };

    const handleEdit = (room) => {
        setEditingId(room.id);
        setForm({
            name: room.name || '',
            capacity: String(room.capacity || 30),
            type: room.type || 'lecture',
            is_lab: Boolean(room.is_lab),
            maintenance_mode: Boolean(room.maintenance_mode),
            maintenance_note: room.maintenance_note || ''
        });
        setErrors({});
    };

    const handleMaintenanceToggle = async (room) => {
        const nextMaintenance = !room.maintenance_mode;
        const nextNote = nextMaintenance
            ? (window.prompt('Maintenance note', room.maintenance_note || 'Blocked for maintenance') || 'Blocked for maintenance')
            : '';
        try {
            await apiFetch(`/classrooms/${room.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: room.name,
                    capacity: room.capacity,
                    type: room.type,
                    is_lab: room.is_lab,
                    maintenance_mode: nextMaintenance,
                    maintenance_note: nextNote
                })
            });
            toast.success(nextMaintenance ? 'Room blocked for maintenance' : 'Maintenance block cleared');
            loadClassrooms();
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Maintenance update failed');
        }
    };

    /** @param {any} id */
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this classroom?")) return;
        try {
            await apiFetch(`/classrooms/${id}`, { method: 'DELETE' });
            toast.success('Classroom deleted');
            setClassrooms(classrooms.filter(c => c.id !== id));
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Delete failed');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Classrooms</h1>
                <p className="text-secondary text-sm">Manage rooms, labs, and maintenance blocks</p>
            </div>

            <div className="card-glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                    {editingId ? 'Edit Classroom' : 'Add Classroom'}
                </h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                        <label className="block text-secondary text-sm mb-2">Name</label>
                        <input
                            className="w-full input-quantum p-3 rounded-lg"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-secondary text-sm mb-2">Capacity</label>
                        <input
                            type="number"
                            className="w-full input-quantum p-3 rounded-lg"
                            value={form.capacity}
                            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                        />
                        {errors.capacity && <p className="text-danger text-xs mt-1">{errors.capacity}</p>}
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-secondary text-sm mb-2">Type</label>
                        <select
                            className="w-full input-quantum p-3 rounded-lg"
                            value={form.type}
                            onChange={(e) => setForm({ ...form, type: e.target.value })}
                        >
                            <option value="lecture">Lecture</option>
                            <option value="seminar">Seminar</option>
                            <option value="lab">Lab</option>
                        </select>
                    </div>
                    <div className="md:col-span-1 flex flex-col justify-center">
                        <label className="block text-secondary text-sm mb-2">Lab Room</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                className="accent-primary w-4 h-4"
                                checked={form.is_lab}
                                onChange={(e) => setForm({ ...form, is_lab: e.target.checked })}
                            />
                            <span className="text-sm text-secondary">
                                {form.is_lab ? 'Dedicated lab room' : 'Standard room'}
                            </span>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-secondary text-sm mb-2">Maintenance Status</label>
                        <div className="flex items-center gap-3 mb-3">
                            <input
                                type="checkbox"
                                className="accent-primary w-4 h-4"
                                checked={form.maintenance_mode}
                                onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })}
                            />
                            <span className="text-sm text-secondary">
                                {form.maintenance_mode ? 'Room blocked for maintenance' : 'Room available for scheduling'}
                            </span>
                        </div>
                        <input
                            className="w-full input-quantum p-3 rounded-lg disabled:opacity-50"
                            disabled={!form.maintenance_mode}
                            placeholder="Maintenance note"
                            value={form.maintenance_note}
                            onChange={(e) => setForm({ ...form, maintenance_note: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-4 flex items-center gap-3">
                        <button type="submit" className="btn-primary px-6 py-3 rounded-lg font-semibold">
                            {editingId ? 'Update Classroom' : 'Add Classroom'}
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
                        <table className="w-full min-w-[980px] text-left">
                            <thead className="bg-white/5 border-b border-white/10 text-secondary">
                                <tr>
                                    <th className="p-4">ID</th>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Capacity</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Lab</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Maintenance Note</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classrooms.length === 0 && (
                                    <tr><td colSpan={8} className="p-4 text-center text-secondary">No classrooms yet.</td></tr>
                                )}
                                {classrooms.map((room) => (
                                    <tr key={room.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-secondary">#{room.id}</td>
                                        <td className="p-4 text-white">{room.name}</td>
                                        <td className="p-4 text-secondary">{room.capacity}</td>
                                        <td className="p-4 text-secondary uppercase text-xs">{room.type || 'lecture'}</td>
                                        <td className="p-4 text-secondary">{room.is_lab ? 'Yes' : 'No'}</td>
                                        <td className="p-4">
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${room.maintenance_mode
                                                ? 'bg-warning/15 text-warning'
                                                : 'bg-success/15 text-success'
                                                }`}>
                                                {room.maintenance_mode ? 'Blocked' : 'Available'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-secondary">{room.maintenance_note || '-'}</td>
                                        <td className="p-4 text-right space-x-3">
                                            <button onClick={() => handleEdit(room)} className="btn-outline px-3 py-1 rounded text-xs">Edit</button>
                                            <button
                                                onClick={() => handleMaintenanceToggle(room)}
                                                className="btn-outline px-3 py-1 rounded text-xs"
                                            >
                                                {room.maintenance_mode ? 'Unblock' : 'Block'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(room.id)}
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

export default ClassroomManagement;
