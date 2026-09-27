/**
 * An occasional Mass — a funeral Mass, a wake Mass, a Mass for an office or
 * a school — and what the parish needs to know for each. Reservations
 * only: the office confirms and the offering is settled there.
 *
 * Shared by the guest form, the devotee form and the admin, so all write
 * the same `details` shape.
 */
export const MASS_TYPES = ['Funeral Mass', 'Wake Mass', 'Office Mass', 'School Mass'];

const req = fields => fields.map(f => ({ required: !f.optional, ...f }));

/* For a funeral or a wake the requester is asked for first, on a step of
   its own: the requestor's name, and how they are related to the departed. */
export const REQUESTER_FIELDS = req([
    { key: 'relationship', label: 'Relationship to the Deceased', placeholder: 'Enter your relationship (son, daughter, spouse, sibling…)' },
]);

export const OCCASION_FIELDS = {
    /* Both follow the parish's own "Information of the Deceased" sheet,
       field for field, so the office types what it already reads off the
       paper. The married and single halves are optional: only one of them
       is ever true of a person. */
    'Funeral Mass': req([
        { key: 'deceased',    label: 'Name' },
        { key: 'age',         label: 'Age',                 type: 'number' },
        { key: 'birthDate',   label: 'Date of Birth',       type: 'date', optional: true },
        { key: 'deathDate',   label: 'Date of Death',       type: 'date' },
        { key: 'cause',       label: 'Cause',               optional: true },
        { key: 'status',      label: 'Status',              type: 'select', options: ["Single","Married","Widow","Widower"] },
        /* Only one of the two applies, so neither is insisted on */
        { key: 'spouseName',  label: 'Name of Spouse',      section: 'If married', optional: true },
        { key: 'children',    label: 'No. of Children',     section: 'If married', type: 'number', optional: true },
        { key: 'parentsName', label: 'Name of Parents',     section: 'If single',  optional: true },
        { key: 'residence',   label: 'Address' },
        { key: 'funeralDate', label: 'Date of Funeral',     type: 'date', optional: true },
        { key: 'funeralTime', label: 'Time of Funeral',     type: 'time', optional: true },
    ]),
    'Wake Mass': req([
        { key: 'deceased',    label: 'Name' },
        { key: 'age',         label: 'Age',                 type: 'number' },
        { key: 'birthDate',   label: 'Date of Birth',       type: 'date', optional: true },
        { key: 'deathDate',   label: 'Date of Death',       type: 'date' },
        { key: 'cause',       label: 'Cause',               optional: true },
        { key: 'status',      label: 'Status',              type: 'select', options: ["Single","Married","Widow","Widower"] },
        /* Only one of the two applies, so neither is insisted on */
        { key: 'spouseName',  label: 'Name of Spouse',      section: 'If married', optional: true },
        { key: 'children',    label: 'No. of Children',     section: 'If married', type: 'number', optional: true },
        { key: 'parentsName', label: 'Name of Parents',     section: 'If single',  optional: true },
        { key: 'residence',   label: 'Address' },
        { key: 'wakeDate',    label: 'Date of Wake',        type: 'date', optional: true },
        { key: 'wakeTime',    label: 'Time of Wake',        type: 'time', optional: true },
    ]),
    /* An office or a school says where the Mass will be held itself — the
       venue is typed, not picked from the parish's places */
    'Office Mass': req([
        { key: 'organisation', label: 'Office / Organisation' },
        { key: 'address',      label: 'Address' },
        { key: 'occasion',     label: 'Occasion', placeholder: 'Enter the occasion (anniversary, blessing of the office, thanksgiving…)' },
    ]),
    'School Mass': req([
        { key: 'organisation', label: 'School' },
        { key: 'address',      label: 'Address' },
        { key: 'occasion',     label: 'Occasion', placeholder: 'Enter the occasion (opening of classes, graduation, foundation day…)' },
    ]),
};

/** Every kind of occasional Mass asks where it will be held — typed in, not
    picked from a list: a wake at the family's home, an office's hall, the
    parish church. */
export const asksWhere = massType => Boolean(massType);

/** What to suggest in the "where" box, by kind */
export const wherePlaceholder = massType => (isForDeceased(massType)
    ? "Enter the place (e.g. the parish church, a chapel, or the family's home at 12 Rizal St.)"
    : "Enter the place (e.g. the office's conference hall, the school gym, or the parish church)");

export const isForDeceased = massType => /funeral|wake/i.test(String(massType || ''));

export const getOccasionFields = massType => OCCASION_FIELDS[massType] || [];
