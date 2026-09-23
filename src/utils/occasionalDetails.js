/**
 * An occasional Mass — a funeral Mass, a wake Mass, a Mass for an office or
 * a school — and what the parish needs to know for each. Reservations
 * only: the office confirms and the offering is settled there.
 *
 * Shared by the guest form, the devotee form and the admin, so all write
 * the same `details` shape.
 */
export const MASS_TYPES = ['Funeral Mass', 'Wake Mass', 'Office Mass', 'School Mass'];

const req = fields => fields.map(f => ({ required: true, ...f }));

/* For a funeral or a wake the requester is asked for first, on a step of
   its own: the requestor's name, and how they are related to the departed. */
export const REQUESTER_FIELDS = req([
    { key: 'relationship', label: 'Relationship to the Deceased', placeholder: 'Son, daughter, spouse, sibling…' },
]);

export const OCCASION_FIELDS = {
    'Funeral Mass': req([
        { key: 'deceased',   label: "Deceased's Full Name" },
        { key: 'age',        label: 'Age',            type: 'number' },
        { key: 'deathDate',  label: 'Date of Death',  type: 'date' },
        { key: 'residence',  label: 'Residence' },
        { key: 'burialPlace', label: 'Place of Burial' },
    ]),
    'Wake Mass': req([
        { key: 'deceased',   label: "Deceased's Full Name" },
        { key: 'age',        label: 'Age',            type: 'number' },
        { key: 'deathDate',  label: 'Date of Death',  type: 'date' },
        { key: 'wakeAddress', label: 'Address of the Wake' },
        { key: 'wakeUntil',  label: 'Wake Until',     type: 'date' },
    ]),
    /* An office or a school says where the Mass will be held itself — the
       venue is typed, not picked from the parish's places */
    'Office Mass': req([
        { key: 'organisation', label: 'Office / Organisation' },
        { key: 'address',      label: 'Address' },
        { key: 'occasion',     label: 'Occasion', placeholder: 'Anniversary, blessing of the office, thanksgiving…' },
    ]),
    'School Mass': req([
        { key: 'organisation', label: 'School' },
        { key: 'address',      label: 'Address' },
        { key: 'occasion',     label: 'Occasion', placeholder: 'Opening of classes, graduation, foundation day…' },
    ]),
};

/** Does this kind of Mass ask where it will be held? A funeral or a wake is in the church. */
export const asksWhere = massType => !isForDeceased(massType) && Boolean(massType);

export const isForDeceased = massType => /funeral|wake/i.test(String(massType || ''));

export const getOccasionFields = massType => OCCASION_FIELDS[massType] || [];
