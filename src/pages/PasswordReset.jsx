import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { faKey, faEnvelope, faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import { usePageTitle } from '../hooks/useParish';
import ResultPage from '../components/ResultPage';

const MIN_LENGTH = 8;

/**
 * "Forgot password?" — the address to send the reset link to.
 * The answer is the same whether or not the address has an account.
 */
export function ForgotPassword() {
    usePageTitle('Forgot password');

    const [email,  setEmail]  = useState('');
    const [state,  setState]  = useState('idle');   // idle | sending | sent
    const [notice, setNotice] = useState('');
    const [error,  setError]  = useState('');

    const submit = async e => {
        e.preventDefault();
        setState('sending'); setError('');
        try {
            const res = await axiosPublic.post('/forgot-password', { email: email.trim() });
            setNotice(res.data?.message || 'If an account uses that email address, a reset link is on its way.');
            setState('sent');
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not send the link just now. Please try again.');
            setState('idle');
        }
    };

    if (state === 'sent') return (
        <ResultPage
            tone="ok"
            icon={faEnvelope}
            title="Check your email"
            sub={notice}
            foot={<Link to="/login">← Back to sign in</Link>}
        />
    );

    return (
        <ResultPage
            tone="pending"
            icon={faKey}
            title="Forgot your password?"
            sub="Enter the email address on your account and we will send you a link to choose a new password."
            foot={<Link to="/login">← Back to sign in</Link>}
        >
            <form className="auth-resend" onSubmit={submit}>
                {error && <p className="auth-resend__notice auth-resend__notice--bad">{error}</p>}
                <label className="auth-field__label" htmlFor="fp-email">Email address</label>
                <div className="auth-resend__row">
                    <input
                        id="fp-email"
                        className="auth-input"
                        type="email"
                        autoComplete="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                    <button className="auth-btn auth-btn--filled" disabled={state === 'sending'}>
                        {state === 'sending' ? 'Sending…' : 'Send link'}
                    </button>
                </div>
            </form>
        </ResultPage>
    );
}

/**
 * Where the emailed link lands: choose the new password.
 */
export function ResetPassword() {
    usePageTitle('Choose a new password');
    const [params] = useSearchParams();
    const token = params.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirm,  setConfirm]  = useState('');
    const [state,    setState]    = useState(token ? 'idle' : 'invalid');   // idle | saving | done | invalid
    const [error,    setError]    = useState('');
    const [message,  setMessage]  = useState('');

    const submit = async e => {
        e.preventDefault();
        setError('');
        if (password.length < MIN_LENGTH) { setError(`Choose a password of at least ${MIN_LENGTH} characters.`); return; }
        if (password !== confirm) { setError('The two passwords do not match.'); return; }

        setState('saving');
        try {
            const res = await axiosPublic.post('/reset-password', { token, password });
            setMessage(res.data?.message || 'Your password has been changed.');
            setState('done');
        } catch (err) {
            if (err?.response?.data?.code === 'RESET_INVALID') {
                setMessage(err.response.data.message);
                setState('invalid');
            } else {
                setError(err?.response?.data?.message || 'Could not change the password just now. Please try again.');
                setState('idle');
            }
        }
    };

    if (state === 'done') return (
        <ResultPage
            tone="ok"
            icon={faCircleCheck}
            title="Password changed"
            sub={message}
            actions={<Link to="/login" className="auth-btn auth-btn--filled">Go to sign in</Link>}
        />
    );

    if (state === 'invalid') return (
        <ResultPage
            tone="bad"
            icon={faCircleXmark}
            title="Link not usable"
            sub={message || 'This page needs the link from your password reset email.'}
            actions={<Link to="/forgot-password" className="auth-btn auth-btn--filled">Send a new link</Link>}
            foot={<Link to="/login">← Back to sign in</Link>}
        />
    );

    return (
        <ResultPage
            tone="pending"
            icon={faKey}
            title="Choose a new password"
            sub={`Use at least ${MIN_LENGTH} characters. Signing in elsewhere will need the new password too.`}
            foot={<Link to="/login">← Back to sign in</Link>}
        >
            <form className="auth-reset" onSubmit={submit}>
                {error && <p className="auth-resend__notice auth-resend__notice--bad">{error}</p>}
                <label className="auth-field__label" htmlFor="rp-new">New password</label>
                <input
                    id="rp-new"
                    className="auth-input"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter a new password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
                <label className="auth-field__label" htmlFor="rp-confirm">Confirm new password</label>
                <input
                    id="rp-confirm"
                    className="auth-input"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter the new password again"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                />
                <button className="auth-btn auth-btn--filled" disabled={state === 'saving'}>
                    {state === 'saving' ? 'Saving…' : 'Save new password'}
                </button>
            </form>
        </ResultPage>
    );
}
