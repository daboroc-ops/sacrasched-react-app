import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import axiosPublic from '../api/axios';
import useAuth from '../hooks/useAuth';

export default function Login() {
    const { auth, setAuth } = useAuth();
    const navigate          = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errMsg,   setErrMsg]   = useState('');
    const [loading,  setLoading]  = useState(false);

    if (auth?.accessToken) return <Navigate to="/dashboard" replace />;

    const handleSubmit = async e => {
        e.preventDefault();
        setErrMsg('');
        setLoading(true);
        try {
            const res = await axiosPublic.post('/login', { username, password });
            const { accessToken, user } = res.data;
            setAuth({ accessToken, user });
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setErrMsg(err?.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Wordmark */}
            <div className="auth-wordmark">
                <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="auth-wordmark__svg" />
            </div>

            {/* Icon */}
            <div className="auth-icon-wrap">
                <img src="/favicon.svg" alt="SacraSched" />
            </div>

            {/* Error */}
            {errMsg && <div className="auth-error">{errMsg}</div>}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form-wrap">
                <div className="auth-field">
                    <label className="auth-field__label">Username</label>
                    <input
                        className="auth-input"
                        type="text"
                        autoComplete="username"
                        placeholder="Enter your username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                    />
                </div>

                <div className="auth-field">
                    <label className="auth-field__label">Password</label>
                    <input
                        className="auth-input"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>

                <div className="auth-btns">
                    <button
                        type="submit"
                        className="auth-btn auth-btn--filled"
                        disabled={loading}
                    >
                        {loading ? 'Signing in…' : 'Login'}
                    </button>

                    <Link to="/register" style={{ textDecoration: 'none' }}>
                        <button type="button" className="auth-btn auth-btn--outline">
                            Create New Account
                        </button>
                    </Link>
                </div>
            </form>
        </div>
    );
}
