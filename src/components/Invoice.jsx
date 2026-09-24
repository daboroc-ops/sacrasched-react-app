import { intentionGroups } from '../utils/intentions';
import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faDownload } from '@fortawesome/free-solid-svg-icons';
import { toPng } from 'html-to-image';
import ParishMark from './ParishMark';
import { fmtTime } from '../utils/format';

const peso = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
const longDate = d => new Date(d).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const stamp    = d => new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * The invoice for an offering to be settled at the parish office: what was
 * booked, what is owed, the reference the office looks it up by, and the
 * day it must be paid by. The parishioner keeps it as a picture — the
 * "Download invoice" button rasterises the card to a PNG — and shows it at
 * the counter.
 *
 * `r` is a request as /guest answers it (see guest.controller `shape`).
 */
export default function Invoice({ r, parish, service }) {
    const card = useRef(null);

    /* A Mass intention lists each kind with its own name */
    const groups = r?.kind === 'intention' ? intentionGroups(r) : [];
    const [saving, setSaving] = useState(false);
    const [problem, setProblem] = useState('');
    const due = (r.fee || 0) + (r.donation || 0);

    const download = async () => {
        if (!card.current) return;
        setSaving(true); setProblem('');
        try {
            const url = await toPng(card.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
            const a = document.createElement('a');
            a.href = url; a.download = `invoice-${r.reference}.png`;
            document.body.appendChild(a); a.click(); a.remove();
        } catch {
            setProblem('The picture could not be made — a screenshot of this invoice works just as well.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="inv">
            <FontAwesomeIcon icon={faCircleCheck} className="gb__tick" />
            <h3>Your {service} request has been received.</h3>
            {r.settleBy && (
                <p className="gb__sub inv__terms">
                    Please settle your payment by <b>{longDate(r.settleBy)}</b>{r.settleRule ? ` (${r.settleRule})` : ''}.
                    Failure to complete the payment within the given period will result in the automatic
                    cancellation of your request.
                </p>
            )}

            {/* The card is what gets saved: everything the office needs is inside it */}
            <article className="inv__card" ref={card}>
                <header className="inv__head">
                    <ParishMark parish={parish} className="inv__mark" />
                    <div className="inv__parish">
                        <b>{parish?.name || 'Parish'}</b>
                        {parish?.address && <span>{parish.address}</span>}
                    </div>
                    <span className="inv__label">Invoice</span>
                </header>

                <div className="inv__ref">
                    <small>Reference number</small>
                    {/* An older reference is a UUID: long, so smaller */}
                    <code className={String(r.reference || '').length > 16 ? 'inv__ref-long' : ''}>{r.reference}</code>
                </div>

                <dl className="inv__facts">
                    {/* A Mass intention may carry several kinds; each is shown
                        with the name it was offered for, so the office and the
                        parishioner read the same thing. */}
                    {groups.length > 0 ? groups.map(g => (
                        <div key={g.type}>
                            <dt>{g.type}</dt>
                            <dd>{g.allSouls ? 'Offered for all souls — no name' : (g.names.join(', ') || '—')}</dd>
                        </div>
                    )) : (
                        <div><dt>Request</dt><dd>{r.type}{r.what ? ` — ${r.what}` : ''}</dd></div>
                    )}
                    <div><dt>{r.kind === 'intention' ? 'Offered by' : 'Requested by'}</dt><dd>{r.requestorName}</dd></div>
                    {r.preferredDate && (
                        <div><dt>Schedule</dt><dd>{longDate(r.preferredDate)}{r.preferredTime ? `, ${fmtTime(r.preferredTime)}` : ''}</dd></div>
                    )}
                    {r.createdAt && <div><dt>Booked on</dt><dd>{stamp(r.createdAt)}</dd></div>}
                    {r.settleBy && <div><dt>Pay by</dt><dd>{longDate(r.settleBy)}</dd></div>}
                </dl>

                <div className="inv__amount">
                    <div>
                        <small>Amount due at the parish office</small>
                        {r.donation > 0 && <span>Offering {peso(r.fee)} + donation {peso(r.donation)}</span>}
                    </div>
                    <b>{peso(due)}</b>
                </div>

                <footer className="inv__foot">
                    <span>Present this invoice at the parish office when settling your payment.</span>
                    <span>SacraSched</span>
                </footer>
            </article>

            <p className="gb__sub inv__notice">
                Please download and keep a copy of this invoice as an image file and present it at the
                parish office when settling your payment.
            </p>
            <button type="button" className="lp-btn lp-btn--filled gb__pay" onClick={download} disabled={saving}>
                <FontAwesomeIcon icon={faDownload} /> {saving ? 'Preparing…' : 'Download invoice'}
            </button>
            {problem && <p className="gb__error">{problem}</p>}
        </div>
    );
}
