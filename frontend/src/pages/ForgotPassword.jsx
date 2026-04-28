import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setResult(null);
        setLoading(true);
        try {
            const data = await apiFetch('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-shell px-4 py-10 text-white">
            <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-bgCard/80 p-6 shadow-card backdrop-blur-xl">
                <div className="text-[11px] uppercase tracking-[0.34em] text-primary">Account Recovery</div>
                <h1 className="mt-3 text-3xl font-black">Reset password</h1>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <input
                        type="email"
                        className="input-quantum w-full rounded-2xl p-4"
                        placeholder="admin@chronocampus.local"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                    {error && <div className="rounded-2xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div>}
                    {result && (
                        <div className="rounded-2xl border border-success/40 bg-success/10 p-3 text-sm text-success">
                            Temporary password: <span className="font-semibold text-white">{result.temporaryPassword}</span>
                        </div>
                    )}
                    <button disabled={loading} className="btn-primary w-full rounded-2xl py-4 font-semibold uppercase tracking-[0.24em]">
                        {loading ? 'Resetting...' : 'Generate Temporary Password'}
                    </button>
                </form>
                <Link to="/login" className="mt-5 block text-sm text-secondary hover:text-white">Back to login</Link>
            </div>
        </div>
    );
};

export default ForgotPassword;
