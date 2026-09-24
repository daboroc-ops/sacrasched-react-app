import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import axiosPublic from '../api/axios';
import useAuth from '../hooks/useAuth';
import useSiteContent from '../hooks/useSiteContent';
import useParish, { usePageTitle } from '../hooks/useParish';
import { mediaUrl } from '../utils/media';
import { noteSession } from '../utils/session';
import FadeImg from '../components/FadeImg';
import Turnstile from '../components/Turnstile';
import { turnstileEnabled } from '../utils/turnstile';
import FloatField from '../components/FloatField';
import { ResendForm } from './VerifyEmail';

export default function Login() {
    const { auth, setAuth } = useAuth();
    const navigate          = useNavigate();
    const { slots }         = useSiteContent();
    const { parish, isTenant, siteName } = useParish();

    usePageTitle('Sign in');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errMsg,   setErrMsg]   = useState('');
    const [loading,  setLoading]  = useState(false);
    const [captcha,  setCaptcha]  = useState('');
    const [captchaRound, setCaptchaRound] = useState(0);   // bump to reissue a token
    const [unverified,   setUnverified]   = useState('');  // email awaiting confirmation

    if (auth?.accessToken) return <Navigate to="/dashboard" replace />;

    // Set under Content in the admin dashboard; until then a themed panel shows
    const cover = slots['login-cover'];

    const handleSubmit = async e => {
        e.preventDefault();
        setErrMsg('');
        setLoading(true);
        try {
            const res = await axiosPublic.post('/login', {
                username, password, turnstileToken: captcha
            });
            const { accessToken, user, roles } = res.data;
            setAuth({ accessToken, user, roles: roles || [] });
            noteSession();
            // /dashboard inspects the roles and sends staff on to /admin
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setErrMsg(err?.response?.data?.message || 'Login failed. Please try again.');
            setUnverified(err?.response?.data?.code === 'EMAIL_NOT_VERIFIED'
                ? (err.response.data.email || username)
                : '');
            // Each token is single-use — a failed attempt needs a fresh challenge
            setCaptcha('');
            setCaptchaRound(n => n + 1);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-split">

            {/* ── Cover (left) ── */}
            <aside className="auth-cover">
                {cover ? (
                    <FadeImg src={mediaUrl(cover.url)} alt={cover.alt || ''} className="auth-cover__img" />
                ) : (
                    <div className="auth-cover__placeholder" aria-hidden="true">
                        <img src="/favicon.svg" alt="" className="auth-cover__mark" />
                    </div>
                )}

                <div className="auth-cover__caption">
                    <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="auth-cover__wordmark" />
                    {isTenant && <p className="auth-cover__parish">{parish.name}</p>}
                    <p>Book blessings, Mass intentions, sacraments and church documents with your parish.</p>
                </div>
            </aside>

            {/* ── Sign-in panel (right) ── */}
            <main className="auth-panel">
                <div className="auth-panel__inner">
                    <div className="auth-panel__brand">
                        <img src="/favicon.svg" alt="" className="auth-panel__mark" />
                        <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="auth-panel__wordmark" />
                    </div>

                    <h1 className="auth-panel__title">Welcome back</h1>
                    <p className="auth-panel__sub">
                        {isTenant
                            ? `Sign in to ${siteName}.`
                            : 'Sign in to manage your parish requests.'}
                    </p>

                    {errMsg && <div className="auth-error">{errMsg}</div>}
                    {unverified && <ResendForm defaultEmail={unverified} />}

                    <form onSubmit={handleSubmit} className="auth-form-wrap">
                        <FloatField
                            label="Username"
                            type="text"
                            autoComplete="username"
                            placeholder="Enter your username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                        />

                        <FloatField
                            label="Password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />

                        <Turnstile onToken={setCaptcha} resetKey={captchaRound} />

                        <div className="auth-btns">
                            <button
                                type="submit"
                                className="auth-btn auth-btn--filled"
                                disabled={loading || (turnstileEnabled && !captcha)}
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

                    <p className="auth-panel__foot">
                        <Link to="/">← Back to the SacraSched home page</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
