import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { login } from '../utils/api';

const Login = () => {
    const [email, setEmail] = useState('kabileshk702@gmail.com');
    const [password, setPassword] = useState('admin');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    /**
     * @param {React.FormEvent} e
     */
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        }
    };

    return (
        <div className="flex items-center justify-center h-full w-full bg-cyberBlack relative z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glassmorphism p-10 rounded-2xl border border-neonCyan shadow-neon-cyan max-w-md w-full"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neonCyan to-neonPurple mb-2">
                        ChronoClass AI
                    </h1>
                    <p className="text-gray-400 font-mono tracking-widest text-sm">SECURITY AUTHENTICATION</p>
                </div>

                {error && <div className="bg-neonPink/20 border border-neonPink text-neonPink p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-neonCyan font-mono text-sm mb-2"> (EMAIL)</label>
                        <input
                            type="email"
                            className="w-full bg-cyberBlack/80 border border-white/20 text-white p-3 rounded-lg focus:outline-none focus:border-neonCyan focus:shadow-neon-cyan transition-all"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-neonCyan font-mono text-sm mb-2"> (PASSWORD)</label>
                        <input
                            type="password"
                            className="w-full bg-cyberBlack/80 border border-white/20 text-white p-3 rounded-lg focus:outline-none focus:border-neonCyan focus:shadow-neon-cyan transition-all"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        className="w-full py-4 bg-gradient-to-r from-neonCyan to-neonPurple text-white font-bold tracking-widest uppercase rounded-lg shadow-md hover:shadow-neon-cyan transition-all"
                    >
                        Initialize Uplink
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
};

export default Login;
