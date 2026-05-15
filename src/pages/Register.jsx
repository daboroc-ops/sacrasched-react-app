import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCross, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';

const USER_REGEX = /^[A-Za-z][A-Za-z0-9_-]{3,23}$/;
const PWD_REGEX  = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).{8,24}$/;

export default function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        firstname: '', lastname: '', email: '',
        contactNumber: '', username: '', password: '', confirm: ''
    });
    const [errMsg,   setErrMsg]   = useState('');
    const [loading,  setLoading]  = useState(false);
    const [success,  setSuccess]  = useState(false);

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
        <div className="auth-page">
            <div className="auth-card auth-card--success">
                <div className="auth-brand__icon auth-brand__icon--success">
                    <FontAwesomeIcon icon={faCircleCheck} />
                </div>
                <h2 className="auth-title">Account created!</h2>
                <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>
                    You can now sign in with your credentials.
                </p>
                <button className="btn btn--primary btn--full" onClick={() => navigate('/login')}>
                    Go to Sign In
                </button>
            </div>
        </div>
    );

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-brand">
                    <div className="auth-brand__icon">
                        <FontAwesomeIcon icon={faCross} />
                    </div>
                    <h1 className="auth-brand__name">SacraSched</h1>
                </div>

                <h2 className="auth-title">Create account</h2>
                <p className="auth-subtitle">Join your parish scheduling system</p>

                {errMsg && <div className="auth-error">{errMsg}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">First Name</label>
                            <input className="form-input" type="text" value={form.firstname} onChange={set('firstname')} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Name</label>
                            <input className="form-input" type="text" value={form.lastname} onChange={set('lastname')} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={form.email} onChange={set('email')} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Contact Number</label>
                        <input className="form-input" type="tel" value={form.contactNumber} onChange={set('contactNumber')} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input className="form-input" type="text" autoComplete="username" value={form.username} onChange={set('username')} required />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input className="form-input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input className="form-input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
                        </div>
                    </div>

                    <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account?{' '}
                    <Link to="/login" className="auth-link">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
