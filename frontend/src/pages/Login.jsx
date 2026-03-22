// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
     * @param {React.FormEvent} e
     */
    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError('');
        /** @type {Record<string, string>} */
        const nextErrors = {};
        if (!email.trim()) nextErrors.email = 'Email is required.';
        if (!password.trim()) {
            // Password is optional for student auto-login.
        }
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        try {
            const data = await login(email, password, role);
            toast.success('Welcome to LUMOGEN');
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
        <div className="flex items-center justify-center min-h-screen w-full bg-shell relative z-50 px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-glass p-10 rounded-2xl max-w-md w-full relative overflow-hidden"
            >
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primaryGlow to-transparent opacity-70" />
                <div className="text-center mb-8">
                    <BrandMark centered subtitle="Smart Timetable Scheduler" className="justify-center mb-3" />
                    <p className="text-secondary tracking-[0.32em] text-sm uppercase">Secure Access Portal</p>
                </div>

                {authError && <div className="bg-danger/20 border border-danger text-danger p-3 rounded mb-4 text-sm">{authError}</div>}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-secondary text-sm mb-2">Email</label>
                        <input
                            type="email"
                            className="w-full input-quantum p-3 rounded-lg"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                        {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div>
                        <label className="block text-secondary text-sm mb-2">Password (optional)</label>
                        <input
                            type="password"
                            className="w-full input-quantum p-3 rounded-lg"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                        {errors.password && <p className="text-danger text-xs mt-1">{errors.password}</p>}
                    </div>
                    <div>
                        <label className="block text-secondary text-sm mb-2">Login As</label>
                        <select
                            className="w-full input-quantum p-3 rounded-lg"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option value="admin">Admin</option>
                            <option value="teacher">Teacher</option>
                            <option value="student">Student</option>
                        </select>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        type="submit"
                        className="w-full py-3 btn-primary rounded-lg font-bold tracking-widest uppercase"
                    >
                        Enter Workspace
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
};

export default Login;
