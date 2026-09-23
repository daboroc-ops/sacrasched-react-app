import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import useAuth from '../hooks/useAuth';
import { noteSession } from '../utils/session';
import { usePageTitle } from '../hooks/useParish';
import ResultPage from '../components/ResultPage';

/**
 * The platform console's private entrance: /<key>/superadmin
 *
 * The key is never shipped to the browser. This page takes whatever is in the
 * URL, asks the server whether it is the configured one, and renders the
 * sign-in form only if the answer is yes. A wrong key gets the same page any
 * unknown URL would, so the door cannot be found by trying.
 *
 * The key is then sent with the sign-in itself — the server refuses superadmin
 * credentials that arrive without it, so this is a real second factor of a
 * sort, not only a hidden link.
 */
export default function SuperAdminGate() {
    const { gateKey } = useParams();
    const navigate = useNavigate();
    const { setAuth } = useAuth();

    const [state, setState] = useState('checking');   // checking | open | closed

    /* The tab title is part of the surface. Naming the console before the key
       is checked would let anyone probing /anything/superadmin see the route
       exists — so until the door opens, this looks like any dead address. */
    usePageTitle(state === 'open' ? 'Platform console' : 'Page not found');
    const [form,  setForm]  = useState({ username: '', password: '' });
    const [busy,  setBusy]  = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                await axiosPublic.post('/superadmin-gate', { key: gateKey });
                if (alive) setState('open');
            } catch {
                // Wrong key, rate-limited, or the feature is off — all the
                // same answer, so none of them can be told apart.
                if (alive) setState('closed');
            }
        })();
        return () => { alive = false; };
    }, [gateKey]);

    const set = f => e => { setForm(p => ({ ...p, [f]: e.target.value })); setError(''); };

    const submit = async e => {
        e.preventDefault();
        setBusy(true); setError('');
        try {
            const res = await axiosPublic.post('/login',
                { ...form, gateKey },
                { withCredentials: true }
            );
            setAuth(res.data);
            noteSession();
            navigate('/superadmin', { replace: true });
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not sign in.');
        } finally {
            setBusy(false);
        }
    };

    if (state === 'checking') return null;

    if (state === 'closed') return (
        <ResultPage
            tone="bad"
            icon={faTriangleExclamation}
            title="Page not found"
            sub="That address does not lead anywhere."
        />
    );

    return (
        <div className="sag">
            <form className="sag__card" onSubmit={submit}>
                <div className="sag__badge">
                    <FontAwesomeIcon icon={faShieldHalved} />
                </div>

                <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="sag__mark" />
                <h1 className="sag__title">Platform console</h1>
                <p className="sag__sub">
                    This sign-in is for platform staff. Parish accounts use the
                    ordinary sign-in page.
                </p>

                {error && <div className="form-alert form-alert--error">{error}</div>}

                <label className="auth-field__label" htmlFor="sa-user">Username</label>
                <input
                    id="sa-user"
                    className="auth-input"
                    autoComplete="username"
                    value={form.username}
                    onChange={set('username')}
                    required
                />

                <label className="auth-field__label" htmlFor="sa-pass">Password</label>
                <input
                    id="sa-pass"
                    className="auth-input"
                    type="password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={set('password')}
                    required
                />

                <button className="auth-btn auth-btn--filled sag__go" disabled={busy}>
                    {busy ? 'Signing in…' : 'Sign in'}
                </button>

                <p className="sag__note">
                    Keep this address private. Anyone who has it can see this page.
                </p>
            </form>
        </div>
    );
}
