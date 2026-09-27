import { StatusBadge } from './AdminUI';
import FileLink from './FileLink';
import { fmtDate, fmtTime, fmtPeso, fmtStamp, refOf, fullName } from '../../utils/format';
import { getDetailFields, expandDetailFields, groupDetailFields } from '../../utils/sacramentDetails';
import { getOccasionFields, isForDeceased } from '../../utils/occasionalDetails';
import { getDocumentFields } from '../../utils/documentDetails';
import { intentionGroups } from '../../utils/intentions';

/**
 * Everything a parishioner filled in for one booking, laid out the way the
 * form asked for it: the same steps, in the same order, under the same
 * labels. The type-specific parts (a wedding's groom and bride, a
 * funeral's deceased, a certificate's particulars) come from the very
 * field lists the forms are built from, so the two never drift apart.
 *
 * Anything stored that no field list names — an older booking, a field
 * since retired — is still shown under "Other details", never dropped.
 */

const blank = v => v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);

/** A stored value as the form would have shown it. */
function show(value, type) {
    if (blank(value)) return <span className="bd-empty">Not given</span>;
    if (type === 'date') return fmtDate(value);
    if (type === 'time') return fmtTime(value);
    if (type === 'money') return fmtPeso(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
}

/** "sponsor_1_address" → "Sponsor 1 address" — for keys no form names */
const humanise = key => String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, c => c.toUpperCase());

function Rows({ rows }) {
    const shown = rows.filter(Boolean);
    if (!shown.length) return null;
    return (
        <dl className="bd-rows">
            {shown.map(([label, value, type]) => (
                <div className="bd-row" key={label}>
                    <dt>{label}</dt>
                    <dd>{show(value, type)}</dd>
                </div>
            ))}
        </dl>
    );
}

function Section({ title, children }) {
    return (
        <section className="bd-section">
            <h4 className="bd-section__title">{title}</h4>
            {children}
        </section>
    );
}

/** A form's detail fields, grouped under their headings (Groom, Bride …). */
function DetailSections({ title, fields, values }) {
    if (!fields.length) return null;
    return (
        <Section title={title}>
            {groupDetailFields(fields).map((g, i) => (
                <div key={g.section || i} className="bd-group">
                    {g.section && <p className="bd-group__title">{g.section}</p>}
                    <Rows rows={g.fields.map(f => [f.label, values?.[f.key], f.type])} />
                </div>
            ))}
        </Section>
    );
}

/** Whatever `details` holds that the field list does not name. */
function OtherDetails({ fields, values }) {
    const known = new Set(fields.map(f => f.key));
    const rest = Object.entries(values || {}).filter(([k, v]) => !known.has(k) && !blank(v) && typeof v !== 'object');
    if (!rest.length) return null;
    return (
        <Section title="Other details">
            <Rows rows={rest.map(([k, v]) => [humanise(k), v])} />
        </Section>
    );
}

const when = (row, timeLabel = 'Preferred Time') => [
    ['Preferred Date', row.preferredDate, 'date'],
    [timeLabel, row.preferredTime, 'time'],
];

const PAY_CHOICE = { online: 'Online', onsite: 'At the parish office', none: 'Nothing to pay' };

/* ── What each service's form asked, step by step ── */

/** The office's "Paid" tick */
const PaidTick = ({ row }) => (
    <Section title="Payment">
        <Rows rows={[['Paid (verified by the office)', Boolean(row.paymentVerified)]]} />
    </Section>
);

function Blessing({ row }) {
    return (
        <>
            <Section title="What would you like blessed?">
                <Rows rows={[
                    ['Blessing Type', row.blessingType],
                    ['Blessing For', row.blessingFor],
                    ['Where will the blessing be held?', row.venue],
                ]} />
            </Section>
            <Section title="When should the priest come?">
                <Rows rows={when(row)} />
            </Section>
            <PaidTick row={row} />
        </>
    );
}

function MassIntention({ row }) {
    const groups = intentionGroups(row);
    return (
        <>
            <Section title="Which Mass?">
                <Rows rows={[
                    ['Venue', row.venue || 'Parish church'],
                    ['Date', row.preferredDate, 'date'],
                    ['Mass Time', row.preferredTime, 'time'],
                ]} />
            </Section>
            <Section title="What would you like offered?">
                <Rows rows={[['Offered by', row.requestorName]]} />
                {groups.length ? (
                    <dl className="bd-rows">
                        {groups.map(g => (
                            <div className="bd-row" key={g.type}>
                                <dt>{g.type}</dt>
                                <dd>
                                    {g.allSouls ? 'All the souls in purgatory'
                                     : g.names.length ? (
                                        <ul className="bd-list">{g.names.map((n, i) => <li key={i}>{n}</li>)}</ul>
                                     ) : <span className="bd-empty">Not given</span>}
                                </dd>
                            </div>
                        ))}
                    </dl>
                ) : <Rows rows={[['Intention', row.intentionType], ['For', row.intentionFor]]} />}
                <Rows rows={[!blank(row.purpose) && ['Purpose', row.purpose]]} />
            </Section>
        </>
    );
}

function Sacrament({ row }) {
    const fields = expandDetailFields(getDetailFields(row.sacramentType), row.details);
    return (
        <>
            <Section title="Which sacrament, and for whom?">
                <Rows rows={[
                    ['Sacrament Type', row.sacramentType],
                    ['Recipient Name', row.recipientName],
                ]} />
            </Section>
            <Section title="When would you like it?">
                <Rows rows={when(row)} />
            </Section>
            <DetailSections title={`${row.sacramentType || 'Sacrament'} details`} fields={fields} values={row.details} />
            <OtherDetails fields={fields} values={row.details} />
            <Requirements row={row} tick={['Papers complete', row.requirementsComplete]} />
            <PaidTick row={row} />
        </>
    );
}

function OccasionalMass({ row }) {
    const fields = getOccasionFields(row.massType);
    return (
        <>
            <Section title="Which Mass, and when?">
                <Rows rows={[
                    ['Kind of Mass', row.massType],
                    ...when(row),
                ]} />
            </Section>
            <Section title="Who is requesting?">
                <Rows rows={[
                    ['Requestor Name', row.requestorName],
                    isForDeceased(row.massType) && ['Relationship to the Deceased', row.relationship],
                ]} />
            </Section>
            <DetailSections title={`${row.massType || 'Occasional Mass'} details`} fields={fields} values={row.details} />
            <Section title="Where will the Mass be held?">
                <Rows rows={[['Place', row.venue]]} />
            </Section>
            <OtherDetails fields={fields} values={row.details} />
            <PaidTick row={row} />
        </>
    );
}

function DocumentRequest({ row }) {
    const fields = getDocumentFields(row.documentType);
    const copies = Math.max(1, Number(row.copies) || 1);
    return (
        <>
            <Section title="Which document do you need?">
                <Rows rows={[
                    ['Document Type', row.documentType],
                    ['Number of Copies', String(copies)],
                    ['Purpose', row.purpose],
                ]} />
            </Section>
            <DetailSections title={`${row.documentType || 'Document'} details`} fields={fields} values={row.details} />
            <OtherDetails fields={fields} values={row.details} />
            <Requirements row={row} tick={['Ready for pickup', row.readyForPickup]} />
        </>
    );
}

/** The papers uploaded with the form, and the office's tick on them. */
function Requirements({ row, tick }) {
    const files = row.attachments || [];
    return (
        <Section title="Requirements">
            {files.length ? (
                <ul className="bd-files">
                    {files.map(f => (
                        // The link names the requirement it answers itself
                        <li key={f.key}><FileLink file={f} /></li>
                    ))}
                </ul>
            ) : <p className="bd-empty">No files were uploaded with this request.</p>}
            <Rows rows={[tick]} />
        </Section>
    );
}

const BODY = {
    'blessings':         Blessing,
    'mass-intentions':   MassIntention,
    'sacraments':        Sacrament,
    'occasional-masses': OccasionalMass,
    'document-requests': DocumentRequest,
};

export default function BookingDetails({ resource, row }) {
    const Body = BODY[resource];
    if (!Body || !row) return null;

    const account = row.userId && typeof row.userId === 'object' ? row.userId : null;
    const guest   = row.guest || {};
    const total   = (Number(row.fee) || 0) + (Number(row.donation) || 0);

    return (
        <div className="bd">
            <div className="bd-head">
                <div className="bd-head__ref">
                    <span>Reference</span>
                    <b className="ad-mono">{refOf(row)}</b>
                </div>
                {/* When the parishioner booked — the day and the time of day */}
                <div className="bd-head__ref">
                    <span>Booked on</span>
                    <b>{fmtStamp(row.createdAt)}</b>
                </div>
                <StatusBadge status={row.status} />
            </div>

            <Section title="Requested by">
                <Rows rows={[
                    ['Name', row.requestorName || guest.name],
                    ['Contact Number', row.contactNumber || guest.phone],
                    account
                        ? ['Account', `${fullName(account)}${account.email ? ` · ${account.email}` : ''}`]
                        : ['Booked as', 'Guest (no account)'],
                    !account && !blank(guest.email) && ['Email', guest.email],
                ]} />
            </Section>

            <Body row={row} />

            {/* Who presides — the office's to set, shown where it applies */}
            {!blank(row.priest) && (
                <Section title="Presiding priest">
                    <Rows rows={[['Priest', row.priest]]} />
                </Section>
            )}

            <Section title="Offering">
                <Rows rows={[
                    ['Fee', row.fee || 0, 'money'],
                    Number(row.donation) > 0 && ['Donation', row.donation, 'money'],
                    Number(row.donation) > 0 && ['Total', total, 'money'],
                    ['How it will be paid', PAY_CHOICE[row.paymentChoice] || null],
                ]} />
            </Section>

            <Section title="Anything else we should know?">
                <Rows rows={[['Notes', row.additionalNotes]]} />
            </Section>
        </div>
    );
}
