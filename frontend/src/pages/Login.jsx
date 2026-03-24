// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/api';
import { useToast } from '../components/ToastProvider';
import BrandMark from '../components/BrandMark';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('admin');
    const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
    const [authError, setAuthError] = useState('');
    const navigate = useNavigate();
    const toast = useToast();

    /**
     * @param {React.FormEvent} event
     */
    const handleLogin = async (event) => {
        event.preventDefault();
        setAuthError('');

        /** @type {Record<string, string>} */
        const nextErrors = {};
        if (!email.trim()) nextErrors.email = 'Email is required.';

        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        try {
            const data = await login(email, password, role);
            toast.success('Welcome to ChronoCampus');
            const nextRole = data?.user?.role || 'student';
            if (nextRole === 'student') {
                navigate('/student-timetable');
            } else if (nextRole === 'teacher') {
                navigate('/availability');
            } else {
                navigate('/');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            setAuthError(message);
            toast.error(message);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-shell px-4 py-8 text-white md:px-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(98,230,215,0.16),transparent_24%),radial-gradient(circle_at_80%_12%,rgba(255,180,77,0.18),transparent_28%)]" />
            <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_minmax(22rem,0.9fr)]">
                <section className="card-glass flex flex-col justify-between rounded-[2.25rem] p-6 md:p-8">
                    <div>
                        <BrandMark centered={false} subtitle="Campus Timetable Operating System" className="mb-8" />
                        <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] uppercase tracking-[0.34em] text-primary">
                            Scheduling Intelligence
                        </div>
                        <h1 className="mt-6 max-w-2xl text-4xl font-black leading-tight md:text-5xl">
                            Build cleaner academic schedules with less manual chasing.
                        </h1>
                        <p className="mt-5 max-w-xl text-sm leading-7 text-secondary md:text-base">
                            ChronoCampus combines timetable generation, lab planning, teacher availability, absence handling,
                            and review workflows in one control surface.
                        </p>
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                        {[
                            { label: 'Timetable AI', detail: 'Generate and compare options quickly.' },
                            { label: 'Lab-Aware', detail: 'Handle double periods and room constraints.' },
                            { label: 'Live Ops', detail: 'Manage absences, edits, and publishing.' }
                        ].map((item) => (
                            <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4">
                                <div className="text-[11px] uppercase tracking-[0.3em] text-primary">{item.label}</div>
                                <p className="mt-2 text-sm leading-relaxed text-secondary">{item.detail}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="card-glass rounded-[2.25rem] p-6 md:p-8">
                    <div className="mb-8">
                        <div className="text-[11px] uppercase tracking-[0.34em] text-primary">Secure Access</div>
                        <h2 className="mt-3 text-3xl font-black text-white">Enter workspace</h2>
                        <p className="mt-2 text-sm text-secondary">
                            Sign in as admin, teacher, or student to open the right control surface.
                        </p>
                    </div>

                    {authError && (
                        <div className="mb-4 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
                            {authError}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="mb-2 block text-sm text-secondary">Email</label>
                            <input
                                type="email"
                                className="input-quantum w-full rounded-2xl p-4"
                                placeholder="name@campus.edu"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                            />
                            {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm text-secondary">Password (optional)</label>
                            <input
                                type="password"
                                className="input-quantum w-full rounded-2xl p-4"
                                placeholder="Enter password if required"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm text-secondary">Login As</label>
                            <select
                                className="input-quantum w-full rounded-2xl p-4"
                                value={role}
                                onChange={(event) => setRole(event.target.value)}
                            >
                                <option value="admin">Admin</option>
                                <option value="teacher">Teacher</option>
                                <option value="student">Student</option>
                            </select>
                        </div>

                        <button type="submit" className="btn-primary w-full rounded-2xl py-4 font-semibold uppercase tracking-[0.28em]">
                            Enter Workspace
                        </button>
                    </form>

                    <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-secondary">Tip</div>
                        <p className="mt-2 text-sm leading-relaxed text-secondary">
                            After sign-in, the new command palette lets you jump between timetable, analytics, labs, and availability with <span className="text-white">Ctrl/Cmd + K</span>.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Login;
