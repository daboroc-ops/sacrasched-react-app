import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { faCircleCheck, faCircleXmark, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import { usePageTitle } from '../hooks/useParish';
import ResultPage from '../components/ResultPage';

/**
 * Landing page for the link in the confirmation email. Exchanges the token
 * for a verified account, and offers a fresh link when one has expired.
 */
export default function VerifyEmail() {
    const [params] = useSearchParams();
    const token = params.get('token') || '';

    usePageTitle('Confirm your email');

    const [state,   setState]   = useState(token ? 'checking' : 'missing');
    const [message, setMessage] = useState('');
    const [email,   setEmail]   = useState('');

    useEffect(() => {
        if (!token) return undefined;

        let alive = true;
        (async () => {
            try {
                const res = await axiosPublic.post('/verify-email', { token });
                if (!alive) return;
                setMessage(res.data?.message || 'Email confirmed.');
                setState('done');
            } catch (err) {
                if (!alive) return;
                setMessage(err?.response?.data?.message || 'That confirmation link could not be used.');
                setEmail(err?.response?.data?.email || '');
                setState(err?.response?.data?.code === 'TOKEN_EXPIRED' ? 'expired' : 'failed');
            }
        })();

        return () => { alive = false; };
    }, [token]);

    if (state === 'checking') return (
        <ResultPage
            tone="pending"
            icon={faEnvelope}
            title="Confirming…"
            sub="One moment while we check your link."
        />
    );

    if (state === 'done') return (
        <ResultPage
            tone="ok"
            icon={faCircleCheck}
            title="Email confirmed"
            sub={message}
            actions={
                <Link to="/login" className="auth-btn auth-btn--filled">Go to sign in</Link>
            }
        />
    );

    return (
        <ResultPage
            tone="bad"
            icon={faCircleXmark}
            title={state === 'expired' ? 'Link expired' : 'Link not usable'}
            sub={state === 'missing'
                ? 'This page needs the link from your confirmation email.'
                : message}
            foot={<Link to="/login">← Back to sign in</Link>}
        >
            <ResendForm defaultEmail={email} />
        </ResultPage>
    );
}

/* ── Ask for a fresh link ────────────────────────────────────── */

export function ResendForm({ defaultEmail = '' }) {
    const [value,  setValue]  = useState(defaultEmail);
    const [state,  setState]  = useState('idle');
    const [notice, setNotice] = useState('');

    const submit = async e => {
        e.preventDefault();
        setState('sending');
        try {
            const res = await axiosPublic.post('/resend-verification', { email: value.trim() });
            setNotice(res.data?.message || 'If that address needs confirming, a new link is on its way.');
        } catch (err) {
            setNotice(err?.response?.data?.message || 'Could not send a new link just now.');
        } finally {
            setState('sent');
        }
    };

    if (state === 'sent') return <p className="auth-resend__notice">{notice}</p>;

    return (
        <form className="auth-resend" onSubmit={submit}>
            <label className="auth-field__label">Send a new confirmation link</label>
            <div className="auth-resend__row">
                <input
                    className="auth-input"
                    type="email"
                    placeholder="you@example.com"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    required
                />
                <button className="auth-btn auth-btn--outline" disabled={state === 'sending'}>
                    {state === 'sending' ? 'Sending…' : 'Send'}
                </button>
            </div>
        </form>
    );
}
