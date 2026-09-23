import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faRightToBracket, faClipboardList, faCreditCard, faUserShield,
    faGlobe, faGear, faCircleInfo, faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import { relativeTime } from '../../utils/format';

const CATEGORY_ICON = {
    auth:    faRightToBracket,
    request: faClipboardList,
    payment: faCreditCard,
    user:    faUserShield,
    parish:  faGlobe,
    config:  faGear,
    system:  faCircleInfo,
};

/**
 * One audit entry. Clicking it reveals the raw detail — path, IP, agent and
 * whatever `meta` the writer attached.
 */
export function LogRow({ entry }) {
    const [open, setOpen] = useState(false);
    const hasMeta = entry.meta && Object.keys(entry.meta).length > 0;

    return (
        <li className={`sa-log ${entry.outcome === 'failure' ? 'sa-log--failure' : ''}`}>
            <button className="sa-log__main" onClick={() => setOpen(o => !o)} aria-expanded={open}>
                <span className={`sa-log__icon sa-log__icon--${entry.category}`}>
                    <FontAwesomeIcon icon={CATEGORY_ICON[entry.category] || faCircleInfo} />
                </span>

                <span className="sa-log__body">
                    <span className="sa-log__headline">
                        <b>{entry.actorName || 'anonymous'}</b>
                        <code>{entry.action}</code>
                        {entry.targetLabel && <span className="sa-log__target">{entry.targetLabel}</span>}
                    </span>
                    <span className="sa-log__sub">
                        <span className={`sa-chip sa-chip--${entry.category}`}>{entry.category}</span>
                        {entry.outcome === 'failure' && <span className="sa-chip sa-chip--failure">failed</span>}
                        {entry.method && <span className="ad-mono">{entry.method} {entry.path}</span>}
                    </span>
                </span>

                <span className="sa-log__time" title={new Date(entry.createdAt).toLocaleString('en-PH')}>
                    {relativeTime(entry.createdAt)}
                </span>

                <FontAwesomeIcon icon={faChevronDown} className={`sa-log__chevron ${open ? 'sa-log__chevron--open' : ''}`} />
            </button>

            {open && (
                <dl className="sa-log__detail">
                    <div><dt>When</dt><dd>{new Date(entry.createdAt).toLocaleString('en-PH')}</dd></div>
                    <div><dt>Actor</dt><dd>{entry.actorName} <span className="ad-mono">{entry.actorId || '—'}</span></dd></div>
                    <div><dt>Roles</dt><dd className="ad-mono">{(entry.actorRoles || []).join(', ') || '—'}</dd></div>
                    <div><dt>Request</dt><dd className="ad-mono">{entry.method || '—'} {entry.path || '—'} → {entry.statusCode || '—'}</dd></div>
                    <div><dt>Target</dt><dd>{entry.targetType || '—'} <span className="ad-mono">{entry.targetId || ''}</span></dd></div>
                    <div><dt>IP</dt><dd className="ad-mono">{entry.ip || '—'}</dd></div>
                    <div className="sa-log__detail--full"><dt>Agent</dt><dd className="ad-mono">{entry.userAgent || '—'}</dd></div>
                    {hasMeta && (
                        <div className="sa-log__detail--full">
                            <dt>Details</dt>
                            <dd><pre className="sa-log__json">{JSON.stringify(entry.meta, null, 2)}</pre></dd>
                        </div>
                    )}
                </dl>
            )}
        </li>
    );
}
