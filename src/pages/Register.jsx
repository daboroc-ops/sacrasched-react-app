import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import useAuth from '../hooks/useAuth';

const USER_REGEX = /^[A-Za-z][A-Za-z0-9_-]{3,23}$/;
const PWD_REGEX  = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).{8,24}$/;

export default function Register() {
    const { auth } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        firstname: '', lastname: '', email: '',
        contactNumber: '', username: '', password: '', confirm: ''
    });
    const [errMsg,  setErrMsg]  = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (auth?.accessToken) return <Navigate to="/dashboard" replace />;

    const set = field => e => {
        setForm(f => ({ ...f, [field]: e.target.value }));
        setErrMsg('');
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!USER_REGEX.test(form.username)) return setErrMsg('Username: 4–24 chars, starts with a letter, letters/numbers/_ only.');
        if (!PWD_REGEX.test(form.password))  return setErrMsg('Password: 8–24 chars, must include upper, lower, number and !@#$%.');
        if (form.password !== form.confirm)   return setErrMsg('Passwords do not match.');

        setLoading(true);
        try {
            await axiosPublic.post('/register', {
                firstname:     form.firstname,
                lastname:      form.lastname,
                email:         form.email,
                contactNumber: form.contactNumber,
                username:      form.username,
                password:      form.password
            });
            setSuccess(true);
        } catch (err) {
            setErrMsg(err?.response?.data?.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    if (success) return (
        <div className="auth-success">
            <div className="auth-success__card">
                <div className="auth-success__icon">
                    <FontAwesomeIcon icon={faCircleCheck} />
                </div>
                <h2 className="auth-success__title">Account created!</h2>
                <p className="auth-success__sub">
                    You can now sign in with your credentials.
                </p>
                <button
                    className="auth-btn auth-btn--filled"
                    onClick={() => navigate('/login')}
                >
                    Go to Sign In
                </button>
            </div>
        </div>
    );

    return (
        <div className="auth-page">
            {/* Wordmark */}
            <div className="auth-wordmark">
                <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="auth-wordmark__svg" />
            </div>

            {/* Icon */}
            <div className="auth-icon-wrap" style={{ paddingBottom: '28px' }}>
                <img src="/favicon.svg" alt="SacraSched" />
            </div>

            {/* Error */}
            {errMsg && <div className="auth-error">{errMsg}</div>}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form-wrap">
                {/* Name row */}
                <div className="auth-row">
                    <div className="auth-field">
                        <label className="auth-field__label">First name</label>
                        <input
                            className="auth-input"
                            type="text"
                            placeholder="Juan"
                            value={form.firstname}
                            onChange={set('firstname')}
                            required
                        />
                    </div>
                    <div className="auth-field">
                        <label className="auth-field__label">Last name</label>
                        <input
                            className="auth-input"
                            type="text"
                            placeholder="dela Cruz"
                            value={form.lastname}
                            onChange={set('lastname')}
                            required
                        />
                    </div>
                </div>

                <div className="auth-field">
                    <label className="auth-field__label">Email address</label>
                    <input
                        className="auth-input"
                        type="email"
                        placeholder="juan@example.com"
                        value={form.email}
                        onChange={set('email')}
                        required
                    />
                </div>

                <div className="auth-field">
                    <label className="auth-field__label">Contact number</label>
                    <input
                        className="auth-input"
                        type="tel"
                        placeholder="09XX XXX XXXX"
                        value={form.contactNumber}
                        onChange={set('contactNumber')}
                    />
                </div>

                <div className="auth-field">
                    <label className="auth-field__label">Username</label>
                    <input
                        className="auth-input"
                        type="text"
                        autoComplete="username"
                        placeholder="4–24 characters"
                        value={form.username}
                        onChange={set('username')}
                        required
                    />
                </div>

                <div className="auth-field">
                    <label className="auth-field__label">Password</label>
                    <input
                        className="auth-input"
                        type="password"
                        autoComplete="new-password"
                        placeholder="8–24 characters"
                        value={form.password}
                        onChange={set('password')}
                        required
                    />
                </div>

                <div className="auth-field">
                    <label className="auth-field__label">Confirm password</label>
                    <input
                        className="auth-input"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        value={form.confirm}
                        onChange={set('confirm')}
                        required
                    />
                </div>

                <div className="auth-btns">
                    <button
                        type="submit"
                        className="auth-btn auth-btn--filled"
                        disabled={loading}
                    >
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>

                    <Link to="/login" style={{ textDecoration: 'none' }}>
                        <button type="button" className="auth-btn auth-btn--outline">
                            Already have an account? Sign in
                        </button>
                    </Link>
                </div>
            </form>
        </div>
    );
}
