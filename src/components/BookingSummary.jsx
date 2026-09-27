import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChevronLeft, faCircleCheck, faHourglassHalf, faBan, faCircleInfo, faDownload, faSpinner,
    faQrcode, faHandHoldingDollar, faArrowRight, faRotateLeft
} from '@fortawesome/free-solid-svg-icons';
import { toPng } from 'html-to-image';
import ParishBanner from './ParishBanner';
import { intentionGroups } from '../utils/intentions';
import { fmtTime } from '../utils/format';

const peso     = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
const longDate = d => new Date(d).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const payBy    = d => new Date(d).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });

/**
 * Whether it is paid, in words. The booking email says the same thing in
 * the same words — see MidtermProject/utils/bookingEmail.js.
 */
function paymentStatus(r, method) {
    if (r.status === 'rejected')  return { state: 'stopped', text: 'Not accepted by the parish' };
    if (r.status === 'cancelled') return { state: 'stopped', text: 'Cancelled — the payment was not made in time' };
    if (!(r.fee > 0))             return { state: 'free',    text: 'No payment needed' };
    if (r.payment?.status === 'paid') return { state: 'paid', text: 'Paid' };
    const where = method === 'online' ? 'Pay Online' : 'Pay at the Parish Office';
    return { state: 'owed', text: `Unpaid – ${where}${r.settleBy ? ` by ${payBy(r.settleBy)}` : ''}` };
}

const ICON = { paid: faCircleCheck, owed: faHourglassHalf, free: faCircleInfo, stopped: faBan };

/* The two ways to settle an offering, for the slide after Submit — as many
   of them as the parish allows for the service (Configuration → Parish;
   the API refuses the others) */
const WAYS = [
    { id: 'online', icon: faQrcode, title: 'Pay online',
      text: 'QR Ph, GCash, Maya or a bank app. You pay now and your receipt is ready right away.' },
    { id: 'office', icon: faHandHoldingDollar, title: 'Pay at the parish office',
      text: 'Pay at the parish office to settle your payment and complete your request.' }
];

/**
 * A booking, as the person who made it sees it — straight after the
 * wizard, from the link in the booking email, or looked up by reference.
 *
 * It is laid out as the wizard's last steps, in the wizard's own frame, so
 * finishing the form reads as the form finishing rather than a new page:
 *
 *   1. While there is something to pay and no way chosen yet: a slide
 *      asking how — online or at the parish office. No reference yet; the
 *      booking is complete once a way is chosen.
 *   2. Then the invoice: whether it is paid, the Booking Details and the
 *      Reference No. Unpaid, it downloads as a picture to show at the
 *      office ("Download invoice"); paid, the button is the receipt.
 *
 *     `r`         a request as /guest answers it (guest.controller `shape`)
 *     `method`    'online' | 'office' — the way chosen, or null
 *     `choosing`  show the slide asking how to pay
 *     `onChoose`  called with 'online' or 'office' from that slide
 *     `onRechoose` a link back to the slide from an unpaid invoice
 *     `ways`      { online, onsite } — how the parish lets it be paid
 *     `busy`      a choice is being sent
 *     `action`    the button for the bottom right of the invoice, if any
 *     `onBack`    the bottom left — back to the calendar
 */
export default function BookingSummary({
    r, parish, method = null, choosing = false, onChoose, onRechoose, busy = false,
    ways: allowed = { online: true, onsite: true },
    action = null, onBack, backLabel = 'Back to the calendar'
}) {
    const { state, text } = paymentStatus(r, method);
    const ways = WAYS.filter(w => (w.id === 'online' ? allowed.online !== false : allowed.onsite !== false));
    const only = ways.length === 1 ? ways[0].id : null;
    const [way, setWay] = useState(method || only);

    /* Owed, and a way chosen: this screen is the invoice. It is saved as a
       picture to show at the counter — everything but the buttons and the
       notice about saving it. */
    const invoice = state === 'owed' && !choosing;
    const sheet = useRef(null);
    const [saving,  setSaving]  = useState(false);
    const [problem, setProblem] = useState('');
    const download = async () => {
        if (!sheet.current) return;
        setSaving(true); setProblem('');
        // The copy is drawn with the page's live styles: stop the steps'
        // fade-in, or the details are caught still invisible
        sheet.current.classList.add('bsum__sheet--capture');
        try {
            // Down to the reference (the notice and buttons are left out),
            // with a white margin all round
            const el   = sheet.current;
            const top  = el.getBoundingClientRect().top;
            const last = el.querySelector('.bsum__refline') || el.querySelector('.bsum__rows');
            const PAD  = 24;
            const url = await toPng(el, {
                pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true,
                width:  el.offsetWidth + PAD * 2,
                height: Math.ceil(last.getBoundingClientRect().bottom - top) + PAD * 2,
                style:  { padding: `${PAD}px`, boxSizing: 'border-box', margin: '0' },
                filter: node => !node.classList?.contains('bsum__noprint')
            });
            const a = document.createElement('a');
            a.href = url; a.download = `invoice-${r.reference}.png`;
            document.body.appendChild(a); a.click(); a.remove();
        } catch {
            setProblem('The invoice could not be saved as a picture. A screenshot of this page works just as well.');
        } finally {
            sheet.current?.classList.remove('bsum__sheet--capture');
            setSaving(false);
        }
    };

    const groups = r.kind === 'intention' ? intentionGroups(r) : [];
    const total  = (r.fee || 0) + (r.donation || 0);
    const what   = r.service ? r.service[0].toUpperCase() + r.service.slice(1) : 'Request';

    const backButton = onBack ? (
        <button type="button" className="bk-wiz__back" onClick={onBack}>
            <FontAwesomeIcon icon={faChevronLeft} />
            {backLabel}
        </button>
    ) : <span />;

    /* ── The slide after Submit: how to pay ── */
    if (choosing) return (
        <div className="bsum__sheet">
            <ParishBanner parish={parish} eyebrow="Booked with" className="pban--form" />

            <div className="bk-wiz bk-wiz--done gb__wiz bsum">
                <div className="bk-step">
                    <div className="bk-step__head">
                        <h4 className="bk-step__title">How would you like to pay?</h4>
                    </div>

                    <p className="bsum__due">
                        <span>Amount due</span>
                        <b>{peso(total)}</b>
                        {r.settleBy && <small>Settle by {payBy(r.settleBy)}</small>}
                    </p>

                    {only && (
                        <p className="bsum__only">
                            This parish takes payment for this service {only === 'online' ? 'online only' : 'at the parish office only'}.
                        </p>
                    )}

                    <div className="bsum__ways" role="radiogroup" aria-label="How to pay">
                        {ways.map(w => (
                            <label key={w.id} className={`bsum__way${way === w.id ? ' bsum__way--on' : ''}`}>
                                <input type="radio" name="bsum-way" value={w.id}
                                       checked={way === w.id} onChange={() => setWay(w.id)} />
                                <FontAwesomeIcon icon={w.icon} className="bsum__way-icon" />
                                <span>
                                    <b>{w.title}</b>
                                    <small>{w.text}</small>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="bk-wiz__actions">
                    {backButton}
                    <button type="button" className="btn btn--primary" disabled={!way || busy}
                            onClick={() => onChoose?.(way)}>
                        {busy
                            ? <><FontAwesomeIcon icon={faSpinner} spin /> {way === 'online' ? 'Opening checkout…' : 'Saving…'}</>
                            : <>{way === 'online' ? `Pay ${peso(total)} online` : 'Continue'} <FontAwesomeIcon icon={faArrowRight} /></>}
                    </button>
                </div>
            </div>
        </div>
    );

    /* ── The invoice (or, once paid, the receipt's page) ── */
    const downloadButton = invoice && (
        <button type="button" className="btn btn--primary" onClick={download} disabled={saving}>
            <FontAwesomeIcon icon={saving ? faSpinner : faDownload} spin={saving} /> {saving ? 'Saving…' : 'Download invoice'}
        </button>
    );
    const bottomRight = action || downloadButton;

    return (
        <div className="bsum__sheet" ref={sheet}>
            <ParishBanner parish={parish} eyebrow={state === 'paid' ? 'Paid to' : 'Booked with'} className="pban--form" />

            <div className="bk-wiz bk-wiz--done gb__wiz bsum">
                {/* Where the progress bar ran: whether it is paid */}
                <p className={`bsum__status bsum__status--${state}`}>
                    <FontAwesomeIcon icon={ICON[state]} /> {text}
                </p>

                <div className="bk-step">
                    <div className="bk-step__head">
                        <h4 className="bk-step__title">Booking Details</h4>
                    </div>

                    <dl className="bsum__rows">
                        <div><dt>Service</dt><dd>{what}</dd></div>
                        {/* A Mass intention may carry several kinds, each with
                            the name it is offered for */}
                        {groups.length > 0 ? groups.map(g => (
                            <div key={g.type}>
                                <dt>{g.type}</dt>
                                <dd>{g.allSouls ? 'All souls — no name' : (g.names.join(', ') || '—')}</dd>
                            </div>
                        )) : (
                            <div><dt>Request</dt><dd>{r.type}{r.what ? ` — ${r.what}` : ''}</dd></div>
                        )}

                        <div><dt>{r.kind === 'intention' ? 'Offered by' : 'Requested by'}</dt><dd>{r.requestorName}</dd></div>
                        {r.preferredDate && (
                            <div><dt>Schedule</dt><dd>{longDate(r.preferredDate)}{r.preferredTime ? `, ${fmtTime(r.preferredTime)}` : ''}</dd></div>
                        )}
                        {r.venue && <div><dt>Venue</dt><dd>{r.venue}</dd></div>}
                        {r.fee > 0 && (
                            <div>
                                <dt>Amount</dt>
                                <dd>
                                    {peso(total)}
                                    {r.donation > 0 && <small> — offering {peso(r.fee)} + donation {peso(r.donation)}</small>}
                                </dd>
                            </div>
                        )}
                        {r.fee > 0 && method && (
                            <div><dt>Payment</dt><dd>{method === 'online' ? 'Online' : 'At the parish office'}</dd></div>
                        )}
                    </dl>

                    {/* Last before the buttons: the number to quote */}
                    <p className="bsum__refline">
                        <span>Reference No.</span>
                        <b className="bsum__ref">{r.reference}</b>
                    </p>

                    {invoice && allowed.onsite !== false && (
                        <p className="bsum__notice bsum__noprint">
                            <FontAwesomeIcon icon={faCircleInfo} />
                            <span>Please download and keep a copy of this invoice as an image file and present it at the parish office when settling your payment.</span>
                        </p>
                    )}
                    {invoice && onRechoose && (ways.length > 1 || method === 'online') && (
                        <button type="button" className="bsum__rechoose bsum__noprint" onClick={onRechoose}>
                            <FontAwesomeIcon icon={faRotateLeft} />
                            {ways.length === 1 ? 'Try paying online again'
                                : method === 'online' ? 'Try paying online again, or pay at the parish office instead'
                                : 'Pay online instead'}
                        </button>
                    )}
                    {problem && <p className="bsum__problem bsum__noprint">{problem}</p>}
                </div>

                {/* Where Back and Next sit on every step */}
                {(onBack || bottomRight) && (
                    <div className="bk-wiz__actions bsum__noprint">
                        {backButton}
                        {bottomRight || <span />}
                    </div>
                )}
            </div>
        </div>
    );
}
