import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelopeCircleCheck, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import useAuth from '../hooks/useAuth';
import Turnstile from '../components/Turnstile';
import { turnstileEnabled } from '../utils/turnstile';
import { ResendForm } from './VerifyEmail';
import ResultPage from '../components/ResultPage';
import FloatField from '../components/FloatField';

const USER_REGEX  = /^[A-Za-z][A-Za-z0-9_-]{3,23}$/;
const PWD_REGEX   = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).{8,24}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Sign-up is asked one thing at a time: a short page per group of fields
   rather than one long column. The heading tells you what this step wants. */
const STEPS = [
    { title: 'What’s your name?',   sub: 'This is the name your parish office will see on your requests.' },
    { title: 'How can we reach you?', sub: 'We’ll send a confirmation link to your email before your account is active.' },
    { title: 'Choose how you sign in', sub: 'Pick a username and a password you don’t use anywhere else.' },
];

export default function Register() {
    const { auth } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        firstname: '', lastname: '', email: '',
        contactNumber: '', username: '', password: '', confirm: ''
    });
    const [step,    setStep]    = useState(0);
    const [errMsg,  setErrMsg]  = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [captcha, setCaptcha] = useState('');
    const [captchaRound, setCaptchaRound] = useState(0);
    const [emailSent,    setEmailSent]    = useState(true);

    // Focus the first field whenever the step changes, so the form stays
    // keyboard-only: type, Enter, type, Enter.
    const firstField = useRef(null);
    useEffect(() => { firstField.current?.focus(); }, [step]);

    if (auth?.accessToken) return <Navigate to="/dashboard" replace />;

    const set = field => e => {
        setForm(f => ({ ...f, [field]: e.target.value }));
        setErrMsg('');
    };

    /** Whatever this step needs before it will let you move on. */
    const validateStep = () => {
        if (step === 0) {
            if (!form.firstname.trim() || !form.lastname.trim()) return 'Enter your first and last name.';
        }
        if (step === 1) {
            if (!EMAIL_REGEX.test(form.email)) return 'Enter a valid email address.';
        }
        if (step === 2) {
            if (!USER_REGEX.test(form.username)) return 'Username: 4–24 chars, starts with a letter, letters/numbers/_ only.';
            if (!PWD_REGEX.test(form.password))  return 'Password: 8–24 chars, must include upper, lower, number and !@#$%.';
            if (form.password !== form.confirm)  return 'Passwords do not match.';
        }
        return '';
    };

    const back = () => { setErrMsg(''); setStep(s => Math.max(0, s - 1)); };

    const register = async () => {
        setLoading(true);
        try {
            const res = await axiosPublic.post('/register', {
                firstname:     form.firstname,
                lastname:      form.lastname,
                email:         form.email,
                contactNumber: form.contactNumber,
                username:      form.username,
                password:      form.password,
                turnstileToken: captcha
            });
            setEmailSent(res.data?.emailSent !== false);
            setSuccess(true);
        } catch (err) {
            const message = err?.response?.data?.message || 'Registration failed.';
            setErrMsg(message);
            // Send the user back to the step that owns the problem rather than
            // leaving them on the last page with an error about an earlier field.
            if (/email/i.test(message))    setStep(1);
            setCaptcha('');
            setCaptchaRound(n => n + 1);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = e => {
        e.preventDefault();

        const problem = validateStep();
        if (problem) return setErrMsg(problem);

        if (step < STEPS.length - 1) {
            setErrMsg('');
            setStep(s => s + 1);
            return;
        }
        register();
    };

    if (success) return (
        <ResultPage
            tone="ok"
            icon={faEnvelopeCircleCheck}
            title="Confirm your email"
            sub={<>
                We sent a confirmation link to <b>{form.email}</b>. Open it to
                activate your account — you can sign in once it is confirmed.
            </>}
            actions={
                <button className="auth-btn auth-btn--filled" onClick={() => navigate('/login')}>
                    Go to sign in
                </button>
            }
            foot={<ResendForm defaultEmail={form.email} />}
        >
            {!emailSent && (
                <p className="res__note">
                    Email delivery is not configured on this server yet, so the link
                    was written to the server console instead.
                </p>
            )}
        </ResultPage>
    );

    const isLast = step === STEPS.length - 1;

    return (
        <div className="auth-page">
            <div className="auth-wordmark">
                <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="auth-wordmark__svg" />
            </div>

            <div className="auth-icon-wrap">
                <img src="/favicon.svg" alt="SacraSched" />
            </div>

            <div className="auth-form-wrap">

                {/* ── Where you are ── */}
                <div className="rw-progress" aria-hidden="true">
                    {STEPS.map((s, i) => (
                        <span
                            key={s.title}
                            className={`rw-progress__bar ${i <= step ? 'rw-progress__bar--done' : ''}`}
                        />
                    ))}
                </div>
                <p className="rw-progress__count">Step {step + 1} of {STEPS.length}</p>

                <div className="rw-head">
                    <h1 className="rw-head__title">{STEPS[step].title}</h1>
                    <p className="rw-head__sub">{STEPS[step].sub}</p>
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

                <form onSubmit={handleSubmit} className="rw-form">

                    {/* ── Step 1 — name ── */}
                    {step === 0 && (
                        <div className="auth-row">
                            <FloatField
                                ref={firstField}
                                label="First name"
                                type="text"
                                autoComplete="given-name"
                                placeholder=""
                                value={form.firstname}
                                onChange={set('firstname')}
                                required
                            />
                            <FloatField
                                label="Last name"
                                type="text"
                                autoComplete="family-name"
                                placeholder=""
                                value={form.lastname}
                                onChange={set('lastname')}
                                required
                            />
                        </div>
                    )}

                    {/* ── Step 2 — contact ── */}
                    {step === 1 && (
                        <>
                            <FloatField
                                ref={firstField}
                                label="Email address"
                                type="email"
                                autoComplete="email"
                                placeholder=""
                                value={form.email}
                                onChange={set('email')}
                                required
                            />

                            <FloatField
                                label="Contact Number"
                                type="tel"
                                autoComplete="tel"
                                placeholder=""
                                value={form.contactNumber}
                                onChange={set('contactNumber')}
                            />
                        </>
                    )}

                    {/* ── Step 3 — credentials ── */}
                    {step === 2 && (
                        <>
                            <FloatField
                                ref={firstField}
                                label="Username"
                                type="text"
                                autoComplete="username"
                                placeholder=""
                                value={form.username}
                                onChange={set('username')}
                                hint="4–24 characters, starting with a letter. Letters, numbers, _ and - only."
                                required
                            />

                            <FloatField
                                label="Password"
                                type="password"
                                autoComplete="new-password"
                                placeholder="Create a password"
                                value={form.password}
                                onChange={set('password')}
                                hint="Needs an uppercase and lowercase letter, a number, and one of ! @ # $ %"
                                required
                            />

                            <FloatField
                                label="Confirm password"
                                type="password"
                                autoComplete="new-password"
                                placeholder="Re-enter your password"
                                value={form.confirm}
                                onChange={set('confirm')}
                                required
                            />

                            <Turnstile onToken={setCaptcha} resetKey={captchaRound} />
                        </>
                    )}

                    {/* ── Move ── */}
                    <div className="rw-actions">
                        {step > 0 ? (
                            <button type="button" className="rw-back" onClick={back}>
                                <FontAwesomeIcon icon={faArrowLeft} /> Back
                            </button>
                        ) : (
                            <Link to="/login" className="rw-back">Sign in instead</Link>
                        )}

                        <button
                            type="submit"
                            className="auth-btn auth-btn--filled rw-next"
                            disabled={loading || (isLast && turnstileEnabled && !captcha)}
                        >
                            {loading ? 'Creating account…' : isLast ? 'Create Account' : 'Next'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
