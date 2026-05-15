import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCross } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import useAuth from '../hooks/useAuth';

export default function Login() {
    const { setAuth } = useAuth();
    const navigate    = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errMsg,   setErrMsg]   = useState('');
    const [loading,  setLoading]  = useState(false);

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
            <div className="auth-card">
                <div className="auth-brand">
                    <div className="auth-brand__icon">
                        <FontAwesomeIcon icon={faCross} />
                    </div>
                    <h1 className="auth-brand__name">SacraSched</h1>
                    <p className="auth-brand__sub">Parish Scheduling System</p>
                </div>

                <h2 className="auth-title">Welcome back</h2>
                <p className="auth-subtitle">Sign in to manage your requests</p>

                {errMsg && <div className="auth-error">{errMsg}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="username">Username</label>
                        <input
                            id="username"
                            className="form-input"
                            type="text"
                            autoComplete="username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            className="form-input"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn--primary btn--full"
                        disabled={loading}
                    >
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account?{' '}
                    <Link to="/register" className="auth-link">Register here</Link>
                </p>
            </div>
        </div>
    );
}
