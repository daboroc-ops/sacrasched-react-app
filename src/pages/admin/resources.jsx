/**
 * Definitions for the five service-request collections the admin manages.
 * Each one drives the same table + filter + create-form component, so adding
 * another collection is a matter of adding an entry here (plus a route).
 *
 *   columns    — table columns; render(row) returns a cell
 *   fields     — create-form fields; `source` pulls options from /admin-api/config
 *   statuses   — allowed values for the status dropdown
 *   filterStatuses — the statuses offered as filters, when not all of them
 *   typeField  — the field the kind of request is in (sacramentType…)
 *   tabs       — the tabs the list is organised by, each matching every
 *                kind that contains its word ("Wedding" covers a Preferred
 *                and a Regular Wedding); a string names a config category
 *                whose items become the tabs instead
 */
import { intentionGroups } from '../../utils/intentions';
import { fmtDate, fmtDateTime, fmtStamp, fmtPeso, shortId } from '../../utils/format';

const REQUEST_STATUSES = ['pending', 'approved', 'completed', 'cancelled'];
const BOOKING_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

/* Columns every request table starts with */
const idCol = { key: 'id', label: 'ID', render: r => <span className="ad-mono">{shortId(r._id)}</span> };

const requestorCol = (nameKey = 'requestorName', label = 'Requestor') => ({
    key: 'requestor',
    label,
    render: r => (
        <div className="ad-cell-stack">
            <b>{r[nameKey]}</b>
            <span>{r.contactNumber || '—'}</span>
        </div>
    ),
});

const scheduleCol = {
    key: 'schedule',
    label: 'Preferred Date & Time',
    render: r => fmtDateTime(r.preferredDate, r.preferredTime),
};

const submittedCol = { key: 'createdAt', label: 'Submitted', render: r => fmtDate(r.createdAt) };
// The day and the time of day the parishioner booked
const bookedCol    = { key: 'createdAt', label: 'Booked on',  render: r => fmtStamp(r.createdAt) };

/* The name alone — the office asked the contact number off the intention
   and document forms */

/* Fields every request form starts with */
const contactFields = (nameLabel = 'Requestor Name', nameKey = 'requestorName') => ([
    { name: nameKey,        label: nameLabel,     required: true },
    { name: 'contactNumber', label: 'Contact Number', required: true },
]);

const scheduleFields = [
    { name: 'preferredDate', label: 'Preferred Date', type: 'date', required: true },
    { name: 'preferredTime', label: 'Preferred Time', type: 'time', required: true },
];

const notesField = { name: 'additionalNotes', label: 'Additional Notes', type: 'textarea' };

export const RESOURCES = {
    blessings: {
        path:     '/admin-api/blessings',
        title:    'Blessing Requests',
        singular: 'blessing request',
        // The times offered follow the parish's rules, as on its landing page
        service:  'blessing',
        typeKey:  'blessingType',
        typeField: 'blessingType',
        tabs:      'Blessing',          // whatever kinds the parish offers
        // The status follows the payment; nothing here to set — but the
        // office filters by it: All / Pending / Approved / Completed / Cancelled
        statusAutomatic: true,
        statuses: REQUEST_STATUSES,
        columns: [
            idCol,
            requestorCol(),
            { key: 'blessingType', label: 'Type',         render: r => r.blessingType || '—' },
            { key: 'blessingFor',  label: 'Blessing For', render: r => r.blessingFor  || '—' },
            scheduleCol,
        ],
        fields: [
            ...contactFields(),
            { name: 'blessingType', label: 'Blessing Type', required: true, source: 'Blessing' },
            { name: 'blessingFor',  label: 'Blessing For',  required: true, placeholder: 'e.g. New house on Rizal St.' },
            ...scheduleFields,
            { name: 'venue',  label: 'Venue',  source: 'venues'  },
            notesField,
        ],
    },

    'mass-intentions': {
        path:     '/admin-api/mass-intentions',
        title:    'Mass Intentions',
        singular: 'mass intention',
        service:  'intention',
        typeKey:  'intentionType',
        typeField: 'intentionType',
        tabs:      'Mass Intention',    // every kind under Mass Intention
        noStatusFilter: true,
        exportSheet: true,    // the intentions for one Mass, as a PDF
        statuses: REQUEST_STATUSES,
        statusAutomatic: true,
        columns: [
            idCol,
            requestorCol('requestorName', 'Offered by'),
            { key: 'intentionType', label: 'Type',          render: r => r.intentionType || '—' },
            { key: 'intentionFor',  label: 'Intention For', render: r => {
                /* Each kind with the name offered for it, so a booking
                   carrying two kinds does not read as one run of names. */
                const groups = intentionGroups(r);
                return (
                    <div className="ad-cell-stack">
                        {groups.length ? groups.map(g => (
                            <span key={g.type}>
                                <b className="int-group__type">{g.type}</b>
                                {g.allSouls ? '' : ` — ${g.names.join(', ') || '—'}`}
                            </span>
                        )) : <span>{r.intentionFor || '—'}</span>}
                        {r.purpose && <span className="ad-muted">{r.purpose}</span>}
                        {r.venue   && <span className="ad-muted">at {r.venue}</span>}
                    </div>
                );
            } },
            { key: 'donation',      label: 'Donation',      render: r => (r.donation > 0 ? fmtPeso(r.donation) : '—') },
            scheduleCol,
        ],
        /* The kinds, their names and the souls come from the same block the
           public form uses, rather than a single type and a line of text. */
        intentionFields: true,
        fields: [
            /* The contact number is not optional: the model requires it, and
               a walk-in booking was refused outright without it. */
            ...contactFields('Offered by'),
            { name: 'venue',         label: 'Venue',          placeholder: 'Parish, or the cemetery for Undas' },
            ...scheduleFields,
            notesField,
        ],
    },

    sacraments: {
        path:     '/admin-api/sacraments',
        title:    'Sacraments',
        singular: 'sacrament request',
        service:  'sacrament',
        typeKey:  'sacramentType',
        typeField: 'sacramentType',
        tabs: [
            { label: 'Wedding',      match: 'wedding' },        // Preferred + Regular
            { label: 'Baptism',      match: 'baptism' },
            { label: 'Confirmation', match: 'confirmation' },
        ],
        // The parish asked for the status to follow payment and the papers
        // rather than a button: unpaid = pending, paid = approved, paid and
        // requirements complete = completed. Nothing is "rejected".
        statuses: ['pending', 'approved', 'completed', 'cancelled'],
        statusAutomatic: true,
        requirements: true,        // the office ticks "papers complete"
        attachments:  true,        // what the requester uploaded
        hasDetails: true,          // renders the type-specific detail fields
        columns: [
            idCol,
            requestorCol(),
            { key: 'sacramentType', label: 'Sacrament Type', render: r => r.sacramentType || '—' },
            { key: 'recipientName', label: 'Recipient',      render: r => r.recipientName || '—' },
            scheduleCol,
            bookedCol,
        ],
        fields: [
            ...contactFields(),
            { name: 'sacramentType', label: 'Sacrament Type', required: true, source: 'Sacrament' },
            { name: 'recipientName', label: 'Recipient Name', required: true },
            ...scheduleFields,
            notesField,
        ],
    },

    'document-requests': {
        path:     '/admin-api/document-requests',
        // Paid → approved; completed once the office ticks "ready for pickup"
        statusAutomatic: true,
        ready: true,
        title:    'Document Requests',
        singular: 'document request',
        typeField: 'documentType',
        // The office files by paid (approved) and released (completed) only
        filterStatuses: ['approved', 'completed'],
        tabs: [
            { label: 'Baptismal Certificate',    match: 'baptismal' },
            { label: 'Confirmation Certificate', match: 'confirmation' },
            { label: 'Marriage Certificate',     match: 'marriage' },
            { label: 'Burial',                   match: 'burial' },
        ],
        statuses: REQUEST_STATUSES,
        columns: [
            idCol,
            requestorCol(),
            { key: 'documentType', label: 'Document Type', render: r => r.documentType || '—' },
            { key: 'purpose',      label: 'Purpose',       render: r => r.purpose      || '—' },
            { key: 'copies',       label: 'Copies',        render: r => r.copies ?? 1 },
            {
                key: 'details', label: 'Particulars',
                render: r => {
                    const d = r.details || {};
                    const line = [d.name || d.groom || d.deceased, d.bride && `& ${d.bride}`,
                                  d.birthDate || d.marriageDate || d.deathDate].filter(Boolean).join(' · ');
                    return line || '—';
                }
            },
            submittedCol,
        ],
        attachments: true,
        /* The same particulars the public form asks for, by document type */
        hasDocDetails: true,
        fields: [
            /* A contact number is required by the model: without it every
               walk-in document request was refused. */
            ...contactFields(),
            { name: 'documentType', label: 'Document Type', required: true, source: 'Document Request' },
            { name: 'purpose',      label: 'Purpose',       required: true },
            { name: 'copies',       label: 'Copies',        type: 'number', min: 1, defaultValue: 1 },
            notesField,
        ],
    },

    'occasional-masses': {
        path:     '/admin-api/occasional-masses',
        title:    'Occasional Masses',
        singular: 'occasional Mass',
        service:  'occasional',
        typeKey:  'massType',
        typeField: 'massType',
        tabs: [
            { label: 'Funeral Mass', match: 'funeral' },
            { label: 'Wake Mass',    match: 'wake' },
            { label: 'Office Mass',  match: 'office' },
            { label: 'School Mass',  match: 'school' },
        ],
        statuses: REQUEST_STATUSES,
        statusAutomatic: true,
        hasOccasion: true,       // the details of the occasion, by kind
        columns: [
            idCol,
            requestorCol(),
            { key: 'massType', label: 'Mass',     render: r => r.massType || '—' },
            { key: 'for',      label: 'For',      render: r => r.details?.deceased || r.details?.organisation || '—' },
            { key: 'venue',    label: 'Venue',    render: r => r.venue || 'Church' },
            scheduleCol,
            bookedCol,
        ],
        fields: [
            ...contactFields(),
            { name: 'relationship', label: 'Relationship', placeholder: 'Son, daughter, spouse…' },
            { name: 'massType', label: 'Kind of Mass', required: true, options: ['Funeral Mass', 'Wake Mass', 'Office Mass', 'School Mass'] },
            ...scheduleFields,
            { name: 'venue', label: 'Venue', source: 'venues' },
            notesField,
        ],
    },

    'facility-bookings': {
        path:     '/admin-api/facility-bookings',
        title:    'Facility Bookings',
        singular: 'facility booking',
        statuses: BOOKING_STATUSES,
        columns: [
            idCol,
            requestorCol('contactPersonName'),
            { key: 'facilityType', label: 'Facility', render: r => r.facilityType || '—' },
            scheduleCol,
            submittedCol,
        ],
        fields: [
            ...contactFields('Contact Person', 'contactPersonName'),
            { name: 'facilityType', label: 'Facility', required: true, source: 'venues' },
            ...scheduleFields,
            notesField,
        ],
    },
};

/**
 * Options for a form field. `source` is either a config service-category name
 * (whose items become options) or 'priests' / 'venues'.
 */
export function optionsFor(source, config) {
    if (Array.isArray(source)) return source;
    if (!source || !config) return [];
    if (source === 'priests') {
        return (config.priests || []).map(p => [p.title, p.name].filter(Boolean).join(' '));
    }
    if (source === 'venues') {
        return (config.venues || []).map(v => v.name);
    }
    // Category names are free text ("Sacraments", "Mass Intentions"), so match
    // on a contained keyword — the same rule useConfig uses for the devotee forms.
    const category = (config.serviceCategories || []).find(
        c => c.name.toLowerCase().includes(source.toLowerCase())
    );
    return (category?.items || []).map(i => i.name);
}

/**
 * The tabs over a list, resolved: fixed ones as given, a category name
 * turned into one tab per item the parish offers under it.
 */
export function tabsFor(cfg, config) {
    if (Array.isArray(cfg.tabs)) return cfg.tabs;
    if (typeof cfg.tabs === 'string') return optionsFor(cfg.tabs, config).map(name => ({ label: name, match: name }));
    return [];
}

/** How many rows a tab covers — every kind whose name contains its word. */
export function tabCount(tab, typeCounts = {}) {
    const m = tab.match.toLowerCase();
    return Object.entries(typeCounts).reduce((n, [kind, count]) => (kind.toLowerCase().includes(m) ? n + count : n), 0);
}
