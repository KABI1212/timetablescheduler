import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiFetch } from '../utils/api';
import { useToast } from '../components/ToastProvider';

const defaultForm = {
    name: '',
    code: '',
    credits: '3',
    theory_hours: '3',
    is_lab: false,
    lab_duration: '2',
    lab_hours: '2'
};

const SubjectManagement = () => {
    const [subjects, setSubjects] = useState(/** @type {any[]} */([]));
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(defaultForm);
    const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
    const [editingId, setEditingId] = useState(/** @type {number | null} */ (null));
    const toast = useToast();

    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        try {
            const data = await apiFetch('/subjects');
            setSubjects(data);
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Failed to fetch subjects');
        } finally {
            setLoading(false);
        }
    };

    const validate = () => {
        /** @type {Record<string, string>} */
        const nextErrors = {};
        if (!form.name.trim()) nextErrors.name = 'Subject name is required.';
        if (!form.code.trim()) nextErrors.code = 'Subject code is required.';
        if (!form.credits || Number.isNaN(Number(form.credits))) nextErrors.credits = 'Credits must be a number.';
        const theoryHours = parseInt(form.theory_hours, 10);
        if (!Number.isFinite(theoryHours) || theoryHours < 0) nextErrors.theory_hours = 'Theory hours must be zero or more.';
        if (!form.is_lab && Number.isFinite(theoryHours) && theoryHours <= 0) {
            nextErrors.theory_hours = 'Theory-only subjects need at least one theory hour.';
        }
        if (form.is_lab) {
            const labDuration = parseInt(form.lab_duration, 10);
            const labHours = parseInt(form.lab_hours, 10);
            if (!Number.isFinite(labDuration) || labDuration <= 0) nextErrors.lab_duration = 'Lab duration must be a positive number.';
            if (!Number.isFinite(labHours) || labHours <= 0) nextErrors.lab_hours = 'Lab hours must be a positive number.';
            if (Number.isFinite(labDuration) && Number.isFinite(labHours) && labHours % labDuration !== 0) {
                nextErrors.lab_hours = 'Lab hours must be a multiple of lab duration.';
            }
            if (Number.isFinite(theoryHours) && Number.isFinite(labHours) && theoryHours === 0 && labHours === 0) {
                nextErrors.theory_hours = 'Add theory hours or lab hours for the subject.';
            }
        }
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
            const theoryHours = parseInt(form.theory_hours, 10);
            const labDuration = parseInt(form.lab_duration, 10);
            const labHours = parseInt(form.lab_hours, 10);
            const payload = {
                name: form.name.trim(),
                code: form.code.trim(),
                credits: parseInt(form.credits, 10),
                is_lab: Boolean(form.is_lab),
                lab_duration: form.is_lab && Number.isFinite(labDuration) ? labDuration : 1,
                theory_hours: Number.isFinite(theoryHours) ? theoryHours : 3,
                lab_hours: form.is_lab && Number.isFinite(labHours) ? labHours : 0
            };
            if (editingId) {
                await apiFetch(`/subjects/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                toast.success('Subject updated');
            } else {
                await apiFetch('/subjects', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                toast.success('Subject added');
            }
            resetForm();
            loadSubjects();
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Save failed');
        }
    };

    const handleEdit = (subject) => {
        setEditingId(subject.id);
        setForm({
            name: subject.name || '',
            code: subject.code || '',
            credits: String(subject.credits || 3),
            theory_hours: String(Number.isFinite(subject.theory_hours) ? subject.theory_hours : 3),
            is_lab: Boolean(subject.is_lab),
            lab_duration: String(Number.isFinite(subject.lab_duration) ? subject.lab_duration : 2),
            lab_hours: String(Number.isFinite(subject.lab_hours) ? subject.lab_hours : (subject.is_lab ? 2 : 0))
        });
        setErrors({});
    };

    /** @param {number|string} id */
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this subject?")) return;
        try {
            await apiFetch(`/subjects/${id}`, { method: 'DELETE' });
            toast.success('Subject deleted');
            setSubjects(subjects.filter(s => s.id !== id));
        } catch (err) {
            const error = /** @type {Error} */ (err);
            toast.error(error.message || 'Delete failed');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Subjects</h1>
                    <p className="text-secondary text-sm">Manage theory subjects and lab periods</p>
                </div>
            </div>

            <div className="card-glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                    {editingId ? 'Edit Subject' : 'Add Subject'}
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
                        <label className="block text-secondary text-sm mb-2">Code</label>
                        <input
                            className="w-full input-quantum p-3 rounded-lg"
                            value={form.code}
                            onChange={(e) => setForm({ ...form, code: e.target.value })}
                        />
                        {errors.code && <p className="text-danger text-xs mt-1">{errors.code}</p>}
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-secondary text-sm mb-2">Credits</label>
                        <input
                            type="number"
                            className="w-full input-quantum p-3 rounded-lg"
                            value={form.credits}
                            onChange={(e) => setForm({ ...form, credits: e.target.value })}
                        />
                        {errors.credits && <p className="text-danger text-xs mt-1">{errors.credits}</p>}
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-secondary text-sm mb-2">Theory Hours / Week</label>
                        <input
                            type="number"
                            min="0"
                            className="w-full input-quantum p-3 rounded-lg"
                            value={form.theory_hours}
                            onChange={(e) => setForm({ ...form, theory_hours: e.target.value })}
                        />
                        {errors.theory_hours && <p className="text-danger text-xs mt-1">{errors.theory_hours}</p>}
                    </div>
                    <div className="md:col-span-1 flex flex-col justify-center">
                        <label className="block text-secondary text-sm mb-2">Lab Subject</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                className="accent-primary w-4 h-4"
                                checked={form.is_lab}
                                onChange={(e) => setForm({ ...form, is_lab: e.target.checked, lab_duration: '2' })}
                            />
                            <span className="text-sm text-secondary">
                                {form.is_lab ? 'Includes lab periods' : 'Theory only'}
                            </span>
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-secondary text-sm mb-2">Lab Duration</label>
                        <input
                            type="number"
                            min="2"
                            disabled
                            className="w-full input-quantum p-3 rounded-lg disabled:opacity-50"
                            value={form.is_lab ? '2' : form.lab_duration}
                        />
                        {errors.lab_duration && <p className="text-danger text-xs mt-1">{errors.lab_duration}</p>}
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-secondary text-sm mb-2">Lab Hours / Week</label>
                        <input
                            type="number"
                            min="0"
                            disabled={!form.is_lab}
                            className="w-full input-quantum p-3 rounded-lg disabled:opacity-50"
                            value={form.lab_hours}
                            onChange={(e) => setForm({ ...form, lab_hours: e.target.value })}
                        />
                        {errors.lab_hours && <p className="text-danger text-xs mt-1">{errors.lab_hours}</p>}
                    </div>
                    <div className="md:col-span-4 flex items-center gap-3">
                        <button type="submit" className="btn-primary px-6 py-3 rounded-lg font-semibold">
                            {editingId ? 'Update Subject' : 'Add Subject'}
                        </button>
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="btn-outline px-4 py-3 rounded-lg text-sm"
                            >
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
                                    <th className="p-4">Code</th>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Credits</th>
                                    <th className="p-4">Theory Hrs</th>
                                    <th className="p-4">Lab Hrs</th>
                                    <th className="p-4">Lab Duration</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subjects.length === 0 && (
                                    <tr><td colSpan={9} className="p-4 text-center text-secondary">No subjects yet.</td></tr>
                                )}
                                {subjects.map((subject, i) => (
                                    <motion.tr
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        key={subject.id}
                                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                    >
                                        <td className="p-4 text-secondary">#{subject.id}</td>
                                        <td className="p-4 font-semibold text-primary">{subject.code}</td>
                                        <td className="p-4 text-white">{subject.name}</td>
                                        <td className="p-4 text-secondary uppercase text-xs">{subject.is_lab ? 'Theory + Lab' : 'Theory'}</td>
                                        <td className="p-4 text-secondary">{subject.credits} CR</td>
                                        <td className="p-4 text-secondary">{Number.isFinite(subject.theory_hours) ? subject.theory_hours : 3}</td>
                                        <td className="p-4 text-secondary">{Number.isFinite(subject.lab_hours) ? subject.lab_hours : 0}</td>
                                        <td className="p-4 text-secondary">{Number.isFinite(subject.lab_duration) ? subject.lab_duration : '-'}</td>
                                        <td className="p-4 text-right space-x-3">
                                            <button onClick={() => handleEdit(subject)} className="btn-outline px-3 py-1 rounded text-xs">Edit</button>
                                            <button
                                                onClick={() => handleDelete(subject.id)}
                                                className="btn-danger px-3 py-1 rounded text-xs"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default SubjectManagement;
