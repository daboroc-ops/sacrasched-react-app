/**
 * Type-specific sacrament detail fields, keyed by a keyword found in the
 * sacrament type name (case-insensitive). Shared by the devotee booking
 * form, the guest form and the admin create form so all write the same
 * `details` shape.
 *
 * Every field is required — the parish asked that nothing be left blank.
 *
 * A field's `section` groups it under a heading — the wedding's Groom and
 * Bride — so the form asks the same things of each in the same order.
 *
 * Every wedding, preferred or regular, asks how many principal sponsors
 * there are (up to six) and then for that many names.
 */
const req = fields => fields.map(f => ({ required: true, ...f }));

/** How many sponsor names a wedding form shows, at most */
export const MAX_SPONSORS = 6;

/* The same questions of each, under their own heading */
const person = (who, prefix) => [
    { key: prefix,              label: 'Full Name',      section: who },
    { key: `${prefix}Age`,     label: 'Age',            section: who, type: 'number' },
    { key: `${prefix}Address`, label: 'Address',        section: who },
    { key: `${prefix}Father`,  label: "Father's Name",  section: who },
    { key: `${prefix}Mother`,  label: "Mother's Name",  section: who },
];

const WEDDING = req([
    ...person('Groom', 'groom'),
    ...person('Bride', 'bride'),
    // How many principal sponsors; the names follow, one field each
    { key: 'sponsorCount', label: 'How many?', section: 'Principal Sponsors', type: 'select',
      options: Array.from({ length: MAX_SPONSORS }, (_, i) => String(i + 1)), sponsors: true },
]);

export const DETAIL_FIELDS = {
    wedding: WEDDING,
    'preferred wedding': WEDDING,
    /* From the parish's own Magpabunyag (baptism) form, field for field. The
       priest is not asked — the parish assigns one, the parish priest by
       default — so no 'minister' here. */
    baptism: req([
        { key: 'fullName',         label: "Child's Full Name" },
        { key: 'birthdate',        label: 'Date of Birth',            type: 'date' },
        { key: 'age',              label: 'Age',                      type: 'number' },
        { key: 'fatherBirthplace', label: "Father's Place of Birth" },
        { key: 'motherBirthplace', label: "Mother's Place of Birth" },
        { key: 'parentsMarriage',  label: "Parents' Place of Marriage",
          type: 'select', options: ['Civil', 'Church', 'Not yet'] },
        { key: 'sponsor_1',         label: 'Ninong (Godfather)' },
        { key: 'sponsor_1_address', label: "Ninong's Address" },
        { key: 'sponsor_2',         label: 'Ninang (Godmother)' },
        { key: 'sponsor_2_address', label: "Ninang's Address" },
    ]),
    confirmation: req([
        { key: 'fullName',  label: "Candidate's Full Name" },
        { key: 'father',    label: "Father's Name" },
        { key: 'mother',    label: "Mother's Name" },
        { key: 'sponsor_1', label: 'Sponsor 1' },
        { key: 'sponsor_2', label: 'Sponsor 2' },
    ]),
    funeral: req([
        { key: 'fullName',   label: "Deceased's Full Name" },
        { key: 'age',        label: 'Age',              type: 'number' },
        { key: 'residence',  label: 'Residence' },
        { key: 'status',     label: 'Civil Status' },
        { key: 'father',     label: "Father's Name" },
        { key: 'mother',     label: "Mother's Name" },
        { key: 'marriedto',  label: 'Married To' },
        { key: 'deathDate',  label: 'Date of Death',   type: 'date' },
        { key: 'burialDate', label: 'Burial Date',     type: 'date' },
    ]),
};

/** Matches "Holy Baptism", "Wedding (Church)", "Preferred Wedding", … by contained keyword. */
export function getDetailFields(sacramentTypeName) {
    if (!sacramentTypeName) return [];
    const key = sacramentTypeName.toLowerCase();
    // The more specific name first: a preferred wedding is not a wedding here
    if (key.includes('preferred') && key.includes('wedding')) return DETAIL_FIELDS['preferred wedding'];
    for (const [k, fields] of Object.entries(DETAIL_FIELDS)) {
        if (k !== 'preferred wedding' && key.includes(k)) return fields;
    }
    return [];
}

/**
 * The fields to show for the values so far: the sponsor-count select
 * expands into that many name fields (sponsor_1 … sponsor_N).
 */
/**
 * The fields in the order given, with a heading wherever the section
 * changes: [{ section, fields }] — one group with no section when the
 * fields have none.
 */
export function groupDetailFields(fields) {
    const groups = [];
    for (const f of fields || []) {
        const last = groups[groups.length - 1];
        if (last && (last.section || '') === (f.section || '')) last.fields.push(f);
        else groups.push({ section: f.section || '', fields: [f] });
    }
    return groups;
}

export function expandDetailFields(fields, values) {
    const out = [];
    for (const f of fields || []) {
        out.push(f);
        if (f.sponsors) {
            const n = Math.min(MAX_SPONSORS, Math.max(0, parseInt(values?.[f.key], 10) || 0));
            for (let i = 1; i <= n; i++) out.push({ key: `sponsor_${i}`, label: `Principal Sponsor ${i}`, section: f.section, required: true });
        }
    }
    return out;
}
