import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey, faCopy, faCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

/**
 * The one and only showing of a generated password.
 *
 * The server hashes it on the way in and hands back a single plaintext copy;
 * nothing stores it, so closing this panel is the end of it. That is worth
 * saying plainly on screen — an operator who assumes they can look it up
 * later will lock somebody out.
 */
export default function CredentialsNotice({ username, email, password, onClose, context }) {
    const [copied, setCopied] = useState('');

    const copy = async (what, value) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(what);
            setTimeout(() => setCopied(''), 2000);
        } catch { /* clipboard blocked — the value is on screen anyway */ }
    };

    return (
        <div className="cred">
            <header className="cred__head">
                <span className="cred__icon"><FontAwesomeIcon icon={faKey} /></span>
                <div>
                    <h3>Sign-in details {context ? `for ${context}` : 'created'}</h3>
                    <p>Give these to the parish. They can change the password once signed in.</p>
                </div>
            </header>

            <dl className="cred__rows">
                <div>
                    <dt>Username</dt>
                    <dd>
                        <code>{username}</code>
                        <button type="button" className="cred__copy" onClick={() => copy('u', username)}>
                            <FontAwesomeIcon icon={copied === 'u' ? faCheck : faCopy} />
                            {copied === 'u' ? 'Copied' : 'Copy'}
                        </button>
                    </dd>
                </div>
                {email && (
                    <div>
                        <dt>Email</dt>
                        <dd><code>{email}</code></dd>
                    </div>
                )}
                <div>
                    <dt>Password</dt>
                    <dd>
                        <code className="cred__password">{password}</code>
                        <button type="button" className="cred__copy" onClick={() => copy('p', password)}>
                            <FontAwesomeIcon icon={copied === 'p' ? faCheck : faCopy} />
                            {copied === 'p' ? 'Copied' : 'Copy'}
                        </button>
                    </dd>
                </div>
            </dl>

            <p className="cred__warn">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                This password is shown once. It is stored only as a hash, so it cannot
                be recovered — if it is lost, issue a new one.
            </p>

            {onClose && (
                <button type="button" className="ad-btn ad-btn--filled cred__done" onClick={onClose}>
                    I have saved these
                </button>
            )}
        </div>
    );
}
