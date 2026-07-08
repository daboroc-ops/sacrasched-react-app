import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import useAuth from '../hooks/useAuth';
import useAxiosPrivate from '../hooks/useAxiosPrivate';

export default function ProfileView() {
    const { auth, setAuth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const user = auth?.user;

    const [form, setForm] = useState({
        firstname: user?.firstname || '',
        lastname:  user?.lastname  || '',
        email:     user?.email     || '',
        contactNumber: user?.contactNumber || '',
        password:  '',
        confirm:   '',
    });
    const [error,   setError]   = useState('');
    const [success, setSuccess] = useState(false);
    const [saving,  setSaving]  = useState(false);

    const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

    const handleSave = async () => {
        if (form.password && form.password !== form.confirm) {
            setError('Passwords do not match.');
            return;
        }
        setSaving(true);
        setError('');
        setSuccess(false);
        try {
            const body = {
                firstname: form.firstname,
                lastname:  form.lastname,
                email:     form.email,
                contactNumber: form.contactNumber,
            };
            if (form.password) body.password = form.password;
            await axiosPrivate.patch('/user/profile', body);
            setAuth(prev => ({ ...prev, user: { ...prev.user, ...body } }));
            setForm(f => ({ ...f, password: '', confirm: '' }));
            setSuccess(true);
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const displayName = user
        ? `${user.firstname} ${user.lastname}`
        : (auth?.username || 'User');
    const initial = (user?.firstname?.[0] || 'U').toUpperCase();

    return (
        <div className="profile-page">

            {/* ── Avatar header ── */}
            <div className="profile-page__header">
                <div className="profile-page__avatar">{initial}</div>
                <div className="profile-page__hero-info">
                    <p className="profile-page__hero-name">{displayName}</p>
                    <p className="profile-page__hero-role">Parishioner</p>
                </div>
            </div>

            {/* ── Personal info ── */}
            <div className="page-card profile-page__card">
                <h3 className="profile-page__section-title">Personal Information</h3>

                <div className="profile-page__row">
                    <div className="form-group">
                        <label className="form-label">First Name</label>
                        <input className="form-input" value={form.firstname} onChange={set('firstname')} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Last Name</label>
                        <input className="form-input" value={form.lastname} onChange={set('lastname')} />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={set('email')} />
                </div>

                <div className="form-group">
                    <label className="form-label">Contact Number</label>
                    <input className="form-input" type="tel" value={form.contactNumber} onChange={set('contactNumber')}
                        placeholder="e.g. 09171234567" />
                </div>
            </div>

            {/* ── Change password ── */}
            <div className="page-card profile-page__card">
                <h3 className="profile-page__section-title">Change Password</h3>
                <p className="profile-page__sub">Leave blank to keep your current password.</p>

                <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input className="form-input" type="password" value={form.password} onChange={set('password')} />
                </div>
                <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input className="form-input" type="password" value={form.confirm} onChange={set('confirm')} />
                </div>
            </div>

            {/* ── Feedback + action ── */}
            {error   && <p className="profile-page__error">{error}</p>}
            {success && (
                <p className="profile-page__success">
                    <FontAwesomeIcon icon={faCheck} />
                    Profile updated successfully.
                </p>
            )}

            <div className="profile-page__actions">
                <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>

        </div>
    );
}
