import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChurch, faMagnifyingGlass, faCircleCheck, faCopy, faCreditCard, faChevronLeft, faCalendarDay, faFileArrowDown,
    faHourglassHalf, faHandHoldingDollar, faCalendarDays, faCircleExclamation, faBan, faClock, faLocationDot,
} from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import Turnstile from './Turnstile';
import { turnstileEnabled } from '../utils/turnstile';
import BookingWizard from './BookingWizard';
import ParishBanner from './ParishBanner';
import Invoice from './Invoice';
import { TicketSkeleton } from './Skeleton';
import FadeImg from './FadeImg';
import useSiteContent from '../hooks/useSiteContent';
import useGuestCode from '../hooks/useGuestCode';
import useAvailability from '../hooks/useAvailability';
import { mediaUrl } from '../utils/media';
import { getDetailFields, expandDetailFields } from '../utils/sacramentDetails';
import { getDocumentFields, missingDetail } from '../utils/documentDetails';
import { MASS_TYPES, REQUESTER_FIELDS, getOccasionFields, isForDeceased, asksWhere } from '../utils/occasionalDetails';
import { intentionFee, isNamedSouls, needsForWhom, amountDue, offeringProblem, soulsProblem } from '../utils/intentions';
import OfferingStep from './forms/OfferingStep';
import DetailFields from './forms/DetailFields';
import ContactConfirm from './forms/ContactConfirm';
import RequirementUploads from './forms/RequirementUploads';
import IntentionFields from './forms/IntentionFields';
import VenueSelect from './forms/VenueSelect';
import MassVenueSelect from './forms/MassVenueSelect';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(\+?63|0)?9\d{9}$/;
const cleanPhone = v => String(v || '').replace(/[^\d+]/g, '');

const peso = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtTime = v => {
    if (!v) return '';
    const [h, m] = String(v).split(':').map(Number);
    if (Number.isNaN(h)) return v;
    return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const longDate = iso => {
    const [y, m, d] = String(iso).split('-').map(Number);
    if (!y || !m || !d) return '';
    return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
};

/* ── The five services a visitor can ask for ──────────────────
   All are bookable without an account: a mobile number (or an email) is
   confirmed before it is sent, and that plus the reference is what opens the
   request again later. Only the questions differ, and they live here.

   Mass intentions and documents are paid online; a sacrament, a blessing or
   an occasional Mass is settled at the parish office. The API says which
   (config.paysOnline) and enforces it. */
const SERVICES = {
    intention: {
        label:    'Mass intention',
        endpoint: '/guest/mass-intention',
        category: 'mass intention',
        typeKey:  'intentionType',
        done:     'Your Mass intention has been received',
        again:    'Offer another intention',
        fields:   { intentionType: '', intentionTypes: [], souls: [], intentionFor: '', purpose: '', venue: '', wantsDonation: false, offering: '', preferredDate: '', preferredTime: '' },
    },
    blessing: {
        label:    'blessing',
        endpoint: '/guest/blessing',
        category: 'blessing',
        typeKey:  'blessingType',
        done:     'Your blessing request has been received',
        again:    'Request another blessing',
        fields:   { blessingType: '', blessingFor: '', venue: '', preferredDate: '', preferredTime: '' },
    },
    sacrament: {
        label:    'sacrament',
        endpoint: '/guest/sacrament',
        category: 'sacrament',
        typeKey:  'sacramentType',
        done:     'Your sacrament request has been received',
        again:    'Request another sacrament',
        fields:   { sacramentType: '', recipientName: '', preferredDate: '', preferredTime: '' },
    },
    occasional: {
        label:    'occasional Mass',
        endpoint: '/guest/occasional-mass',
        category: 'occasional',
        typeKey:  'massType',
        done:     'Your Mass reservation has been received',
        again:    'Reserve another Mass',
        fields:   { massType: '', relationship: '', venue: '', preferredDate: '', preferredTime: '' },
    },
    document: {
        label:    'document',
        endpoint: '/guest/document-request',
        category: 'document',
        typeKey:  'documentType',
        done:     'Your document request has been received',
        again:    'Request another document',
        fields:   { documentType: '', purpose: '', copies: 1 },
    },
};

const blankFor = (service, date = '') => ({
    requestorName: '', additionalNotes: '',
    ...SERVICES[service].fields,
    ...('preferredDate' in SERVICES[service].fields ? { preferredDate: date } : {}),
});

/** "Sat, Sep 13, 3:15 PM" — when the offering must be settled by. */
const fmtDeadline = iso => new Date(iso).toLocaleString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
});

/** Has the visitor said they will pay at the office? */
const onsiteChosen = r => r?.paymentChoice === 'onsite' || (r?.payment?.method === 'cash' && r.payment.status !== 'paid');

/** How the offering stands, in words. */
const paymentLabel = r => {
    if (r.status === 'cancelled') return 'not settled in time';
    if (!(r.fee > 0))  return 'nothing to pay';
    if (r.payment?.status === 'paid') return 'paid';
    if (onsiteChosen(r)) return 'to be settled at the parish office';
    if (!r.payment)    return 'unpaid';
    return r.payment.status;
};

/** Turn a PDF response into a download the browser will actually save. */
const saveBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Asking a parish for something without an account — any of the five services.
 *
 * The visitor gets a UUID reference, which together with the mobile number
 * (or email) they confirmed is how they check on the request later — there
 * is no password to forget and nothing for the parish to reset.
 *
 * Which service it is comes in as `service`; the questions for each are in
 * QUESTIONS below, and everything around them — proving the contact, the
 * times the parish actually offers, the papers, the notes, the captcha, the
 * reference, paying, the receipt, looking it up again — is the same for all.
 *
 * A booking counts once the visitor has said how they will pay: online, or
 * at the office. One left without that choice is voided by the API after a
 * while and never reaches the calendar.
 *
 * Lives on a parish landing page, and posts to /guest/*, which is mounted
 * ahead of the API's auth middleware. The parish is taken from the host the
 * request arrives on; on the platform's preview route `subdomain` names it.
 */
export default function GuestBooking({
    parishName = 'this parish',
    parishId,
    subdomain = '',
    initialMode = 'intro',
    initialReference = '',
    // From the emailed link: with both of these the status loads on its own
    // and nothing is asked of the visitor.
    autoToken = '',
    // The calendar asks for the day before this form opens, so it arrives
    // already answered rather than being asked for a second time.
    initialDate = '',
    // Where "Cancel" goes when something outside owns the way back — the
    // calendar, in the case of a parish landing page.
    onExit,
    // Which of the five is being asked for.
    service = 'intention',
}) {
    const svc = SERVICES[service] || SERVICES.intention;

    const [mode,        setMode]        = useState(initialMode);  // 'intro' | 'book' | 'track'
    const [form,        setForm]        = useState(() => blankFor(service, initialDate));
    const [details,     setDetails]     = useState({});           // sacrament / certificate / occasion extras
    const [attachments, setAttachments] = useState([]);           // uploaded requirements
    const [config,      setConfig]      = useState({ massSchedule: {}, serviceCategories: [], settings: {}, venues: [], paysOnline: {} });

    /* A parish can publish a wide cover of its own; failing that the card
       picture for Mass intentions stands in, and failing that a themed wash. */
    const { slots } = useSiteContent();
    const cover = slots['offer-cover'] || slots['book-intention'];

    const [busy,   setBusy]   = useState(false);
    const [error,  setError]  = useState('');
    const [booked, setBooked] = useState(null);         // the reference we just created
    const [found,  setFound]  = useState(null);         // a request looked up
    const [copied, setCopied] = useState(false);

    const [captcha, setCaptcha] = useState('');
    const [captchaRound, setCaptchaRound] = useState(0);

    /* The contact is proved, not claimed. The mobile number is the one most
       parishioners have; the email is optional but, if given, also proved. */
    const phone = useGuestCode('phone');
    const email = useGuestCode('email');

    // Prefilled from the ?ref= in the emailed link, so the visitor only has
    // to confirm the contact they booked with.
    const [track, setTrack] = useState({ reference: initialReference, email: '' });

    // 'idle' when there is no link token to act on
    const [autoState, setAutoState] = useState(autoToken && initialReference ? 'loading' : 'idle');

    useEffect(() => {
        if (!autoToken || !initialReference) return;

        let alive = true;
        (async () => {
            try {
                const res = await axiosPublic.post('/guest/lookup', {
                    reference: initialReference,
                    token: autoToken
                });
                if (!alive) return;
                setFound(res.data.request);
                setAutoState('done');
            } catch {
                // Expired, tampered with, or the booking is gone — fall back to
                // asking for the contact rather than dead-ending.
                if (alive) setAutoState('failed');
            }
        })();
        return () => { alive = false; };
    }, [autoToken, initialReference]);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axiosPublic.get('/guest/config', { params: parishId ? { parishId } : {} });
                if (alive) setConfig({ venues: [], paysOnline: {}, ...(res.data || {}) });
            } catch {
                if (alive) setConfig({ massSchedule: {}, serviceCategories: [], settings: {}, venues: [], paysOnline: {} });
            }
        })();
        return () => { alive = false; };
    }, [parishId]);

    const set = field => e => { setForm(f => ({ ...f, [field]: e.target.value })); setError(''); };
    const setDet = (k, v) => setDetails(p => ({ ...p, [k]: v }));

    /* What the parish charges for the thing being asked for, and what it
       needs with it. The category is named by hand in the admin, so match
       loosely. */
    const items = (() => {
        const cat = (config.serviceCategories || []).find(c => c.name?.toLowerCase().includes(svc.category));
        return cat?.items || (service === 'intention' ? config.intentionTypes : []) || [];
    })();

    const typeKey  = svc.typeKey;
    const selected = items.find(t => t.name === form[typeKey]);
    const copies   = Math.max(1, Number(form.copies) || 1);
    const unitFee  = selected?.fee ?? 0;
    // Documents are priced per copy; an intention adds its kinds up and
    // charges the departed per soul; the rest are priced once. The API
    // works the same sums out for itself from the parish's price list.
    const fee = service === 'intention' ? amountDue(intentionFee(items, form.intentionTypes, form.souls), form.offering, form.wantsDonation)
              : service === 'document'  ? unitFee * copies
              : unitFee;

    // Paid online, or settled at the office — the API says which
    const paysOnline = config.paysOnline?.[service] ?? (service === 'intention' || service === 'document');

    const requirements = selected?.requirements || [];
    const detailFields = service === 'sacrament'  ? expandDetailFields(getDetailFields(form.sacramentType), details)
                       : service === 'document'   ? getDocumentFields(form.documentType)
                       : service === 'occasional' ? getOccasionFields(form.massType)
                       : [];

    /* The times the parish actually offers on the chosen day — its own
       Masses for an intention, the office's hours or a sacrament's fixed
       slots otherwise, minus anything already taken or already past. */
    const avail = useAvailability({
        service, type: form[typeKey] || '', date: form.preferredDate, guest: true, subdomain,
        // An intention at a venue of its own follows that venue's Masses
        ...(service === 'intention' && { venue: form.venue || '' })
    });
    const months = config.settings?.advanceMonths || 3;
    // The texted code can be switched off server-side; the number is then
    // taken as given and only an email, if offered, is proved.
    const phoneConfirm = config.phoneConfirm !== false;

    /* Changing the type changes which extras are asked for, so the old
       answers go with it rather than following the visitor to a wedding.
       Only a sacrament's or an occasion's type decides which times are
       offered, so only there does the picked time go with it. */
    const pickType = e => {
        const resets = service === 'sacrament' || service === 'occasional';
        setForm(f => ({ ...f, [typeKey]: e.target.value, ...(resets ? { preferredTime: '' } : {}) }));
        setDetails({});
        setAttachments([]);
        setError('');
    };

    /* Everything the server needs to trust a request from this visitor. */
    const proof = () => ({
        contactNumber: cleanPhone(phone.value),
        phoneToken:    phone.token,
        ...(email.token && { email: email.value.trim(), emailToken: email.token }),
    });

    /* The papers are chosen before the contact is proved, so they are held
       in the browser and only go up here, with the proof, just ahead of the
       request itself. */
    const upload = async (file, requirement) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('requirement', requirement);
        const p = proof();
        fd.append('phone', p.contactNumber);
        if (p.phoneToken)  fd.append('phoneToken', p.phoneToken);
        if (p.email)       { fd.append('email', p.email); fd.append('emailToken', p.emailToken); }
        const res = await axiosPublic.post('/guest/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
        return { ...res.data.file, requirement };
    };

    const submit = async () => {
        setBusy(true); setError('');
        try {
            const stored = [];
            for (const a of attachments) stored.push(a.file ? await upload(a.file, a.requirement) : a);

            // An occasion's requester step writes into `details`; the API
            // wants the relationship beside the name
            const { relationship: rel, ...detailsOut } = details;
            const res = await axiosPublic.post(svc.endpoint, {
                ...form, turnstileToken: captcha,
                // The total is only an offering above the fee when the box was ticked
                offering: form.wantsDonation ? form.offering : '',
                ...proof(),
                ...(service === 'occasional' && rel ? { relationship: rel } : {}),
                ...(detailFields.length && { details: detailsOut }),
                ...(stored.length && { attachments: stored }),
                // Only used when the page is not served from the parish's own
                // subdomain; the API still prefers the host when there is one.
                ...(parishId && { parishId })
            });
            // Keep the contact: the form is cleared below, and paying needs it
            // alongside the reference.
            setBooked({ ...res.data, second: email.token ? email.value.trim() : cleanPhone(phone.value) });
            setForm(blankFor(service, initialDate));
            setDetails({});
            setAttachments([]);
            // The next request is a new person until proven otherwise.
            phone.reset(); email.reset();
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not submit the request. Please try again.');
            setCaptcha(''); setCaptchaRound(n => n + 1);
            // The hour went to someone else while the form was being filled
            // in: ask for the day's times again and go back to pick one.
            if (err?.response?.data?.code === 'TIME_NOT_AVAILABLE') {
                setForm(f => ({ ...f, preferredTime: '' }));
                avail.refresh();
                return 0;
            }
        } finally {
            setBusy(false);
        }
    };

    const lookup = async e => {
        e.preventDefault();
        setBusy(true); setError(''); setFound(null);
        try {
            const res = await axiosPublic.post('/guest/lookup', track);
            setFound(res.data.request);
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not find that request.');
        } finally {
            setBusy(false);
        }
    };

    const pay = async (reference, second) => {
        setBusy(true); setError('');
        try {
            const res = await axiosPublic.post('/guest/payment/checkout', {
                reference,
                ...(autoToken ? { token: autoToken } : { email: second })
            });
            window.location.assign(res.data.checkoutUrl);
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not start the payment.');
            setBusy(false);
        }
    };

    /* The visitor will settle the offering at the office. The request stays
       pending until the office records the cash; this just says so — and
       saying so is what makes the booking count. */
    const payOnsite = async (reference, second) => {
        setBusy(true); setError('');
        try {
            const res = await axiosPublic.post('/guest/payment/onsite', {
                reference, ...(autoToken ? { token: autoToken } : { email: second })
            });
            const request = res.data.request;
            setBooked(b => (b && b.reference === reference ? { ...b, request } : b));
            setFound(f => (f && f.reference === reference ? request : f));
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not record that. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    /* The receipt is a PDF the server draws from the payment record. */
    const receipt = async (reference, second) => {
        setBusy(true); setError('');
        try {
            const res = await axiosPublic.post('/guest/payment/receipt', {
                reference, ...(autoToken ? { token: autoToken } : { email: second })
            }, { responseType: 'blob', timeout: 60000 });
            saveBlob(res.data, `receipt-${String(reference).slice(0, 8)}.pdf`);
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not get the receipt.');
        } finally {
            setBusy(false);
        }
    };

    const copyRef = async reference => {
        try {
            await navigator.clipboard.writeText(reference);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard blocked — the reference is on screen anyway */ }
    };

    /* ── The questions that differ by service ──────────────────
       Everything around them — who you are, the confirmed contact, the
       papers, the notes and the captcha — is the same whichever it is. */

    const typeSelect = (label, placeholder, options = items.map(t => ({ name: t.name, fee: t.fee }))) => (
        <div className="form-group">
            <label className="form-label">{label} <span className="req">*</span></label>
            {options.length ? (
                <select className="form-select" value={form[typeKey]} onChange={pickType}>
                    <option value="">Choose…</option>
                    {options.map(t => (
                        <option key={t.name} value={t.name}>
                            {t.name}{t.fee ? ` — ${peso(t.fee)}` : ''}
                        </option>
                    ))}
                </select>
            ) : (
                /* The office has not published this list yet — let the visitor
                   say it in their own words rather than dead-end them. */
                <input className="form-input" value={form[typeKey]} onChange={pickType} placeholder={placeholder} />
            )}
        </div>
    );

    const feeBox = label => (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <div className={`fee-display${fee ? ' fee-display--active' : ''}`}>
                {fee ? peso(fee) : '—'}
            </div>
        </div>
    );

    /* When. The date came from the calendar, so it is shown rather than asked
       again; the times are whatever the parish offers on that day. */
    const whenStep = (title, sub, { before, beforeTime, validate } = {}) => ({
        title, sub,
        validate: () => {
            const own = validate?.();
            if (own)                 return own;
            if (!form.preferredDate) return 'Choose a date.';
            if (!avail.ok)           return avail.reason || 'That day is not available.';
            if (!form.preferredTime) return 'Choose a time.';
            return null;
        },
        render: () => (
            <>
                {before?.()}
                {/* From the calendar the day is already in the banner above. */}
                {!initialDate && (
                    <div className="form-group">
                        <label className="form-label">Date <span className="req">*</span></label>
                        <input className="form-input" type="date" min={today()} max={avail.window?.to || undefined}
                               value={form.preferredDate}
                               onChange={e => { setForm(f => ({ ...f, preferredDate: e.target.value, preferredTime: '' })); setError(''); }} />
                        <p className="form-hint">{parishName} takes bookings up to {months} month{months === 1 ? '' : 's'} ahead.</p>
                    </div>
                )}
                {beforeTime?.()}
                <div className="form-group">
                    <label className="form-label">Time <span className="req">*</span></label>
                    {!form.preferredDate ? (
                        <p className="form-hint">Select a date first to load the available times.</p>
                    ) : avail.loading ? (
                        <p className="form-hint">Loading the available times…</p>
                    ) : !avail.ok ? (
                        <p className="form-error">{avail.reason}</p>
                    ) : (
                        <select className="form-select" value={form.preferredTime} onChange={set('preferredTime')}>
                            <option value="">Choose…</option>
                            {avail.times.map(t => (
                                <option key={t.time} value={t.time}>
                                    {fmtTime(t.time)}{t.label ? ` — ${t.label}` : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </>
        ),
    });

    /* The papers the parish asks for with a sacrament or a certificate. */
    const papersStep = {
        title: 'Requirements',
        sub: requirements.length
            ? `${parishName} asks for the following with a ${form[typeKey] || svc.label}. Image or PDF.`
            : 'Attach anything the parish asked you to bring, if you have it handy. Image or PDF.',
        render: () => (
            <RequirementUploads
                requirements={requirements}
                value={attachments}
                onChange={setAttachments}
            />
        ),
    };

    /* The type-specific particulars, all of them required */
    const detailsStep = (title, sub) => ({
        title, sub,
        validate: () => missingDetail(detailFields, details),
        render: () => <DetailFields fields={detailFields} values={details} onChange={setDet} />,
    });

    const QUESTIONS = {
        intention: [
            whenStep('Which Mass?', 'Only the Masses said on that day are offered. Same-day intentions close at 4:00 PM.', {
                // On a day when Mass is also said elsewhere — Undas at the
                // cemeteries — the place is chosen first; the times are its
                beforeTime: () => (
                    <MassVenueSelect venues={avail.venues} value={form.venue}
                                     onChange={v => { setForm(f => ({ ...f, venue: v, preferredTime: '' })); setError(''); }} />
                )
            }),
            {
                title: 'What would you like offered?',
                sub: 'Choose the kinds of intention and say who it is offered for.',
                validate: () => {
                    const kinds = form.intentionTypes.filter(Boolean);
                    if (!kinds.length) return 'Choose at least one kind of intention.';
                    // Names only for the departed by name — "All Souls in Purgatory" asks none
                    if (kinds.some(isNamedSouls)) { const p = soulsProblem(form.souls); if (p) return p; }
                    if (needsForWhom(kinds) && !form.intentionFor.trim()) return 'Tell us who the intention is for.';
                    return null;
                },
                render: () => (
                    <IntentionFields
                        items={items}
                        types={form.intentionTypes}
                        souls={form.souls}
                        forWhom={form.intentionFor}
                        purpose={form.purpose}
                        onTypes={v => { setForm(f => ({ ...f, intentionTypes: v, intentionType: v.join(', ') })); setError(''); }}
                        onSouls={v => { setForm(f => ({ ...f, souls: v })); setError(''); }}
                        onForWhom={v => { setForm(f => ({ ...f, intentionFor: v })); setError(''); }}
                        onPurpose={v => setForm(f => ({ ...f, purpose: v }))}
                    />
                ),
            },
            {
                title: 'The offering',
                sub: 'What your intentions come to — and, if you wish, a little more.',
                validate: () => (form.wantsDonation ? offeringProblem(intentionFee(items, form.intentionTypes, form.souls), form.offering) : null),
                render: () => (
                    <OfferingStep
                        items={items}
                        types={form.intentionTypes}
                        souls={form.souls}
                        wants={form.wantsDonation}
                        offering={form.offering}
                        onWants={v => { setForm(f => ({ ...f, wantsDonation: v, ...(v ? {} : { offering: '' }) })); setError(''); }}
                        onOffering={v => { setForm(f => ({ ...f, offering: v })); setError(''); }}
                    />
                ),
            },
        ],

        blessing: [
            whenStep('When would suit you?', 'The office confirms the time, or offers the nearest one it can.'),
            {
                title: 'What would you like blessed?',
                sub: 'Choose the kind of blessing and say what it is for.',
                validate: () => {
                    if (!form.blessingType.trim()) return 'Choose a blessing.';
                    if (!form.blessingFor.trim())  return 'Say what is to be blessed.';
                    return null;
                },
                render: () => (
                    <>
                        {typeSelect('Blessing', 'Enter the kind of blessing')}
                        {feeBox('Offering')}
                        <div className="form-group form-group--full">
                            <label className="form-label">What is being blessed <span className="req">*</span></label>
                            <input className="form-input" value={form.blessingFor} onChange={set('blessingFor')}
                                   placeholder="A house, a vehicle, a business…" />
                        </div>
                        <VenueSelect venues={config.venues} date={form.preferredDate} value={form.venue}
                                     onChange={v => setForm(f => ({ ...f, venue: v }))} />
                    </>
                ),
            },
        ],

        sacrament: [
            /* Which sacrament decides which times are offered — a wedding has
               its own fixed slots — so it is asked with the date. */
            whenStep('Which sacrament, and when?', 'A wedding has its own fixed times; the rest follow office hours.', {
                before:   () => typeSelect('Sacrament', 'Baptism, wedding, confirmation…'),
                validate: () => (form.sacramentType.trim() ? null : 'Choose a sacrament.'),
            }),
            {
                title: 'For whom?',
                sub: 'The offering shown is the one the parish has set for it.',
                validate: () => (form.recipientName.trim() ? null : 'Enter the name of the recipient.'),
                render: () => (
                    <>
                        {feeBox('Offering')}
                        <div className="form-group form-group--full">
                            <label className="form-label">Recipient <span className="req">*</span></label>
                            <input className="form-input" value={form.recipientName} onChange={set('recipientName')}
                                   placeholder="Name of the person receiving it" />
                        </div>
                    </>
                ),
            },

            /* A baptism asks for the parents and godparents, a wedding for the
               couple and the sponsors — the step only exists when the chosen
               sacrament has extras. Every one of them is required. */
            ...(detailFields.length ? [detailsStep(`${form.sacramentType} details`, 'These help the office prepare the record beforehand. All fields are required.')] : []),
            papersStep,
        ],

        occasional: [
            whenStep('Which Mass, and when?', 'A funeral, wake, office or school Mass. The office confirms the reservation.', {
                before: () => typeSelect('Kind of Mass', '', MASS_TYPES.map(name => ({ name, fee: items.find(i => i.name === name)?.fee || 0 }))),
                validate: () => (form.massType ? null : 'Choose the kind of Mass.'),
            }),
            /* For a funeral or a wake: who is asking, before anything else */
            ...(isForDeceased(form.massType) ? [{
                title: 'Who is requesting?',
                sub: 'The office will speak with you about the arrangements.',
                validate: () => {
                    if (!form.requestorName.trim()) return 'Enter your name.';
                    return missingDetail(REQUESTER_FIELDS, details);
                },
                render: () => (
                    <>
                        <div className="form-group form-group--full">
                            <label className="form-label">Requestor Name <span className="req">*</span></label>
                            <input className="form-input" value={form.requestorName} onChange={set('requestorName')}
                                   placeholder="Full name of the person requesting" />
                        </div>
                        <DetailFields fields={REQUESTER_FIELDS} values={details} onChange={setDet} />
                    </>
                ),
            }] : []),
            ...(detailFields.length ? [{
                ...detailsStep(`${form.massType} details`, 'What the office needs for the occasion. All fields are required.'),
                validate: () => missingDetail(detailFields, details)
                    || (asksWhere(form.massType) && !form.venue.trim() ? 'Say where the Mass will be held.' : null),
                render: () => (
                    <>
                        <DetailFields fields={detailFields} values={details} onChange={setDet} />
                        {/* An office or a school names the place itself; a funeral
                            or a wake is in the church */}
                        {asksWhere(form.massType) && (
                            <div className="form-group form-group--full">
                                <label className="form-label">Where will the Mass be held? <span className="req">*</span></label>
                                <input className="form-input" value={form.venue.trim()} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                                       placeholder="e.g. the office's conference hall, the school gym, or the parish church" />
                            </div>
                        )}
                        {feeBox('Offering')}
                    </>
                ),
            }] : []),
        ],

        document: [
            {
                title: 'Which document do you need?',
                sub: 'Pick the document and how many copies — the total updates as you go.',
                validate: () => {
                    if (!form.documentType.trim()) return 'Choose a document.';
                    if (!form.purpose.trim())      return 'Say what the document is for.';
                    return null;
                },
                render: () => (
                    <>
                        {typeSelect('Document', 'Enter the document you need')}
                        <div className="form-group">
                            <label className="form-label">Copies</label>
                            <input className="form-input" type="number" min={1} max={10}
                                   value={form.copies} onChange={set('copies')} />
                        </div>
                        {feeBox(copies > 1 ? `Total for ${copies} copies` : 'Fee')}
                        <div className="form-group form-group--full">
                            <label className="form-label">Purpose <span className="req">*</span></label>
                            <input className="form-input" value={form.purpose} onChange={set('purpose')}
                                   placeholder="School enrolment, marriage requirement…" />
                        </div>
                    </>
                ),
            },

            /* The certificate's own particulars, from the parish's own
               verification slip for that certificate. */
            ...(detailFields.length ? [detailsStep(`${form.documentType} details`, 'What the office needs to find the record.')] : []),
            papersStep,
        ],
    };

    // "Offered by" on an intention; "Your name" elsewhere
    const nameLabel = service === 'intention' ? 'Offered by' : 'Your name';
    const askName   = !(service === 'occasional' && isForDeceased(form.massType));   // already asked, on its own step

    const steps = [
        ...QUESTIONS[service],
        {
            title: 'Anything else we should know?',
            sub: 'Optional — a note for the office.',
            render: () => (
                <div className="form-group form-group--full">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" rows={3}
                              value={form.additionalNotes} onChange={set('additionalNotes')} />
                </div>
            ),
        },
        {
            title: 'How can the parish reach you?',
            sub: phoneConfirm
                ? `${parishName} texts you about your request, so we confirm your number before it is sent. An email is optional.`
                : `${parishName} texts you about your request. An email is optional.`,
            validate: () => {
                // The time was settled on the first step; make sure nothing
                // since has lost it, rather than let the server say so.
                if ('preferredTime' in form && !form.preferredTime) return 'Go back to the first step and choose a time.';
                if (!form.requestorName.trim())         return 'Enter your name.';
                if (!PHONE_RE.test(cleanPhone(phone.value))) return 'Enter a valid mobile number (09XXXXXXXXX).';
                if (email.value.trim() && !EMAIL_RE.test(email.value)) return 'That email address does not look right.';
                if (email.value.trim() && !email.token) return 'Confirm the email address, or clear it to send without one.';
                if (phoneConfirm && !phone.token && !email.token) return 'Confirm your mobile number to send the request.';
                return null;
            },
            render: () => (
                <>
                    {askName && (
                        <div className="form-group form-group--full">
                            <label className="form-label">{nameLabel} <span className="req">*</span></label>
                            <input className="form-input" value={form.requestorName} onChange={set('requestorName')}
                                   placeholder="Enter your name" />
                        </div>
                    )}

                    <ContactConfirm
                        label="Mobile number"
                        required
                        type="tel"
                        placeholder="09XXXXXXXXX"
                        valid={v => PHONE_RE.test(cleanPhone(v))}
                        state={phone}
                        confirm={phoneConfirm}
                        hint={phoneConfirm ? 'We text a 6-digit code to this number.' : 'Your reference is texted to this number.'}
                    />

                    <ContactConfirm
                        label="Email address (optional)"
                        type="email"
                        placeholder="Enter your email"
                        valid={v => EMAIL_RE.test(v)}
                        state={email}
                        hint="If you give one, your reference is emailed there too."
                    />

                    <div className="form-group form-group--full">
                        {service === 'occasional' && (
                            <p className="gb__notice gb__notice--info">
                                <FontAwesomeIcon icon={faCircleExclamation} />
                                <span><b>For reservation only.</b> The parish office confirms the Mass and the arrangements with you.</span>
                            </p>
                        )}
                        <p className="gb__notice">
                            <FontAwesomeIcon icon={faCircleExclamation} />
                            <span><b>No booking cancellation.</b> Once sent, a request cannot be cancelled online — please be sure of the date and time before you submit.</span>
                        </p>
                        <Turnstile onToken={setCaptcha} resetKey={captchaRound} />
                        {fee > 0 && <p className="gb__fee">Offering: <b>{peso(fee)}</b> — {paysOnline ? 'paid online' : 'settled at the parish office'}</p>}
                    </div>
                </>
            ),
        },
    ];

    /* ── The panel's own cover and invitation ── */
    if (mode === 'intro') return (
        <div className="gb gb--intro">
            <div className="gb__cover">
                <span className="gb__cover-art" aria-hidden="true">
                    {cover
                        ? <FadeImg src={mediaUrl(cover.url)} alt="" className="gb__cover-photo" />
                        : <span className="gb__cover-fallback">
                              <FontAwesomeIcon icon={faChurch} />
                          </span>}
                    <span className="gb__cover-veil" />
                </span>

                <div className="gb__cover-body">
                    <span className="gb__eyebrow">No account needed</span>
                    <h2 className="gb__cover-title">Offer a Mass intention</h2>
                    <p className="gb__cover-sub">
                        Send your intention straight to the parish office. You get a
                        reference by text and can check on it any time — no sign-up.
                    </p>
                </div>
            </div>

            <div className="gb__intro-actions">
                <button type="button" className="lp-btn lp-btn--filled gb__start"
                        onClick={() => { setMode('book'); setError(''); }}>
                    <FontAwesomeIcon icon={faChurch} /> Book intention
                </button>
                <button type="button" className="gb__link gb__check"
                        onClick={() => { setMode('track'); setError(''); }}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} /> Check a request
                </button>
            </div>
        </div>
    );

    /* The buttons that settle an offering: online for what is paid online,
       the office for the rest — never both. Once "at the office" is chosen
       there is nothing more to press. */
    const renderPayButtons = (r, reference, second) => {
        if (!(r.fee > 0) || r.status === 'cancelled' || r.payment?.status === 'paid') return null;
        const online = r.paysOnline ?? paysOnline;
        if (online) return (
            <div className="gb__pay-row">
                <button type="button" className="lp-btn lp-btn--filled gb__pay" disabled={busy}
                        onClick={() => pay(reference, second)}>
                    <FontAwesomeIcon icon={faCreditCard} />
                    {busy ? 'Opening checkout…' : `Pay ${peso(r.fee + (r.donation || 0))} online`}
                </button>
            </div>
        );
        if (onsiteChosen(r)) return null;
        return (
            <div className="gb__pay-row">
                <button type="button" className="lp-btn lp-btn--filled gb__pay" disabled={busy}
                        onClick={() => payOnsite(reference, second)}>
                    <FontAwesomeIcon icon={faHandHoldingDollar} /> Pay {peso(r.fee + (r.donation || 0))} at the parish office
                </button>
            </div>
        );
    };

    /* What a looked-up request shows, wherever it is shown. A plain render
       helper, not a component: it closes over this render's state. */
    const renderResult = (r, second, solo = false) => {
        const paid    = r.payment?.status === 'paid';
        const owed    = r.fee > 0 && !paid && r.status !== 'cancelled';
        const day     = r.preferredDate ? new Date(r.preferredDate) : null;
        const tone    = r.status === 'cancelled' || r.status === 'rejected' ? 'bad'
                      : r.status === 'pending' && owed ? 'wait' : 'ok';
        const icon    = tone === 'bad' ? faBan : tone === 'wait' ? faHourglassHalf : faCircleCheck;
        const standing = r.status === 'cancelled' ? 'Cancelled'
                       : r.status === 'rejected'  ? 'Not accepted'
                       : r.status === 'completed' ? 'Completed'
                       : r.status === 'approved'  ? 'Confirmed'
                       : paid ? 'Received — awaiting the office'
                       : owed && onsiteChosen(r) ? 'Reserved — pay at the office'
                       : owed ? 'Awaiting your offering'
                       : 'Received — awaiting the office';

        return (
        <article className={`tk tk--${tone}${solo ? ' tk--solo' : ''}`}>
            {/* How it stands, in one line */}
            <header className="tk__standing">
                <FontAwesomeIcon icon={icon} />
                <b>{standing}</b>
            </header>

            <div className="tk__body">
                {/* What was booked */}
                <div className="tk__head">
                    <small>{r.service}</small>
                    <h3>{r.type}</h3>
                    {r.what && <p>{r.kind === 'intention' ? 'for' : r.kind === 'document' ? 'purpose:' : 'for'} <b>{r.what}</b></p>}
                </div>

                {/* When — a calendar leaf, the way it shows on the parish's calendar */}
                {day && (
                    <div className="tk__when">
                        <div className="tk__leaf">
                            <small>{day.toLocaleDateString('en-PH', { month: 'short' })}</small>
                            <b>{day.getDate()}</b>
                        </div>
                        <div className="tk__when-text">
                            <b>{day.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</b>
                            <span><FontAwesomeIcon icon={faClock} /> {fmtTime(r.preferredTime)}</span>
                            {r.venue && <span><FontAwesomeIcon icon={faLocationDot} /> {r.venue}</span>}
                        </div>
                    </div>
                )}

                <dl className="tk__facts">
                    <div><dt>{r.kind === 'intention' ? 'Offered by' : 'Requested by'}</dt><dd>{r.requestorName}</dd></div>
                    <div><dt>Offering</dt><dd>{r.fee ? peso(r.fee) : 'None'}</dd></div>
                    {r.donation > 0 && <div><dt>Donation</dt><dd>{peso(r.donation)}</dd></div>}
                    <div><dt>Payment</dt><dd className={`tk__pay tk__pay--${paid ? 'paid' : owed ? 'due' : 'none'}`}>{paymentLabel(r)}</dd></div>
                    {r.settleBy && r.status === 'pending' && !paid && (
                        <div className="tk__due"><dt>Settle by</dt><dd>{fmtDeadline(r.settleBy)}</dd></div>
                    )}
                </dl>

                {r.status === 'cancelled' && (
                    <p className="gb__cancelled">
                        This request was cancelled: the offering was not settled in time
                        {r.settleRule ? ` (${r.settleRule})` : ''}. You are welcome to book again.
                    </p>
                )}
            </div>

            {/* The stub: the reference, torn off along the perforation */}
            {solo && (
                <div className="tk__stub">
                    <div className="tk__stub-text">
                        <small>Reference</small>
                        <code>{r.reference}</code>
                    </div>
                    <button type="button" className="gb__copy" onClick={() => copyRef(r.reference)}>
                        <FontAwesomeIcon icon={faCopy} /> Copy
                    </button>
                </div>
            )}

            {/* Still to be paid at the office: the invoice again, to save or show */}
            {owed && onsiteChosen(r) && r.status === 'pending' && (
                <div className="tk__invoice">
                    <Invoice r={r} parish={config.parish || { name: parishName }} service={SERVICES[r.kind]?.label || 'request'} />
                </div>
            )}

            <footer className="tk__actions">
                {renderPayButtons(r, r.reference, second)}

                {paid && (
                    <button type="button" className="lp-btn lp-btn--outline gb__pay" disabled={busy}
                            onClick={() => receipt(r.reference, second)}>
                        <FontAwesomeIcon icon={faFileArrowDown} />
                        {busy ? 'Preparing…' : 'Download receipt'}
                    </button>
                )}

                {onExit ? (
                    <button type="button" className="gb__link" onClick={onExit}>
                        <FontAwesomeIcon icon={faCalendarDays} /> Back to the calendar
                    </button>
                ) : (
                    /* Opened from the emailed link, or back from paying: the
                       calendar is on the parish's landing page */
                    <a className="gb__link" href={subdomain ? `/parish/${subdomain}#calendar` : '/#calendar'}>
                        <FontAwesomeIcon icon={faCalendarDays} /> Back to the calendar
                    </a>
                )}
            </footer>
        </article>
        );
    };

    /* ── Opened from the emailed or texted link ── */
    if (autoState === 'loading') return (
        <div className="gb">
            <TicketSkeleton />
        </div>
    );

    if (autoState === 'done' && found) return (
        <div className="gb">
            <ParishBanner parish={config.parish || { name: parishName }} className="pban--result"
                          eyebrow={found.payment?.status === 'paid' ? 'Paid to' : 'Booked with'} />
            {renderResult(found, '', true)}
            {error && <p className="gb__error gb__error--after">{error}</p>}
        </div>
    );

    /* ── Just booked ──
       Three screens, by what the offering needs:
         • paid online (an intention, a document): one line and the Pay
           button — the reference and the rest come with the receipt;
         • paid at the office, not yet chosen (a sacrament, a blessing): one
           line and the "Pay at the parish office" button;
         • paid at the office, chosen: the invoice — received, pay by when,
           the reference — to download and show at the counter;
         • nothing to pay: received, with the reference. */
    if (booked) {
        const r      = booked.request || {};
        const owed   = r.fee > 0 && r.payment?.status !== 'paid';
        const onsite = owed && onsiteChosen(r);
        const online = r.paysOnline ?? paysOnline;
        const parish = config.parish || { name: parishName };
        const back   = onExit && (
            <button type="button" className="lp-btn lp-btn--outline" onClick={onExit}>
                <FontAwesomeIcon icon={faCalendarDays} /> Back to the calendar
            </button>
        );

        if (onsite) return (
            <div className="gb gb--done">
                <ParishBanner parish={parish} eyebrow="Booked with" />
                <Invoice r={{ ...r, reference: booked.reference }} parish={parish} service={svc.label} />
                {error && <p className="gb__error">{error}</p>}
                <div className="gb__after">{back}</div>
            </div>
        );

        if (owed) return (
            <div className="gb gb--done">
                <ParishBanner parish={parish} eyebrow="Booked with" />
                <h3>
                    {online
                        ? 'Pay now to settle your payment and complete your request.'
                        : 'Pay at the parish office to settle your payment and complete your request.'}
                </h3>
                {renderPayButtons(r, booked.reference, booked.second)}
                {error && <p className="gb__error">{error}</p>}
                <div className="gb__after">{back}</div>
            </div>
        );

        return (
        <div className="gb gb--done">
            <ParishBanner parish={parish} eyebrow={r.payment?.status === 'paid' ? 'Paid to' : 'Booked with'} />
            <FontAwesomeIcon icon={faCircleCheck} className="gb__tick" />
            <h3>{svc.done}</h3>
            <p className="gb__sub">
                {service === 'occasional'
                    ? `This is a reservation: ${parishName} will confirm the Mass and the arrangements with you.`
                    : `${parishName} will confirm it shortly.`}
                {' '}Keep the reference below — with the number you confirmed it is how you check on the request.
            </p>
            <div className="gb__ref">
                <code>{booked.reference}</code>
                <button type="button" className="gb__copy" onClick={() => copyRef(booked.reference)}>
                    <FontAwesomeIcon icon={faCopy} /> {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <p className="gb__sub gb__sub--small">We also sent it to you.</p>

            {error && <p className="gb__error">{error}</p>}

            <div className="gb__after">
                {back}
                <button type="button" className="gb__link" onClick={() => { setBooked(null); setMode('book'); }}>
                    {svc.again}
                </button>
            </div>
        </div>
        );
    }

    return (
        <div className="gb">
            {autoState === 'failed' && (
                <p className="gb__error">
                    That link could not be opened — it may have been changed in transit.
                    Enter the number or email you booked with to see the booking.
                </p>
            )}

            {error && <p className="gb__error">{error}</p>}

            {/* ── Book ── */}
            {mode === 'book' && (
                <BookingWizard
                    className="gb__wiz"
                    steps={steps}
                    onSubmit={submit}
                    onExit={() => { setError(''); onExit ? onExit() : setMode('intro'); }}
                    exitLabel="Cancel"
                    banner={form.preferredDate ? (
                        <p className="gb__day">
                            <FontAwesomeIcon icon={faCalendarDay} />
                            Booking for <b>{longDate(form.preferredDate)}</b>
                        </p>
                    ) : null}
                    submitting={busy}
                    submitLabel={service === 'intention' ? 'Submit intention' : service === 'occasional' ? 'Reserve the Mass' : 'Submit request'}
                    submitDisabled={turnstileEnabled && !captcha}
                />
            )}

            {/* ── Track ── */}
            {mode === 'track' && (
                <form className="gb__form" onSubmit={lookup}>
                    <button type="button" className="gb__back"
                            onClick={() => { setError(''); setFound(null); onExit ? onExit() : setMode('intro'); }}>
                        <FontAwesomeIcon icon={faChevronLeft} /> Back
                    </button>

                    <label className="gb__field">
                        <span>Reference</span>
                        <input className="form-input gb__mono" value={track.reference}
                               onChange={e => { setTrack(t => ({ ...t, reference: e.target.value })); setError(''); }}
                               placeholder="e.g. MS26-000-0012" required style={{ textTransform: 'uppercase' }} />
                    </label>
                    <label className="gb__field">
                        <span>Mobile number or email</span>
                        <input className="form-input" value={track.email}
                               onChange={e => { setTrack(t => ({ ...t, email: e.target.value })); setError(''); }}
                               placeholder="The one you booked with" required />
                    </label>

                    <div className="gb__actions">
                        <button type="submit" className="lp-btn lp-btn--filled" disabled={busy}>
                            {busy ? 'Looking…' : 'Find my request'}
                        </button>
                    </div>

                    {found && renderResult(found, track.email)}
                </form>
            )}
        </div>
    );
}
