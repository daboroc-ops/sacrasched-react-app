/**
 * What the parish asks for on each certificate's verification slip, field
 * for field — so the office gets exactly what it would have written down at
 * the counter. Keyed by a keyword found in the document type's name.
 *
 * Shared by the guest form and the devotee's, so both write the same
 * `details` shape.
 *
 * Everything is required — the parish asked that nothing be left blank —
 * except the date of baptism on a baptismal certificate, which the
 * requester often does not know.
 */
const req = fields => fields.map(f => ({ required: !f.optional, ...f }));

export const DOCUMENT_FIELDS = {
    /* Baptismal / Confirmation certificate — the same slip serves both.
       The date of baptism is optional; the date of confirmation is not. */
    baptism: req([
        { key: 'name',             label: 'Name' },
        { key: 'gender',           label: 'Gender', type: 'select', options: ['Male', 'Female'] },
        { key: 'birthDate',        label: 'Date of Birth',  type: 'date' },
        { key: 'birthPlace',       label: 'Place of Birth' },
        { key: 'baptismDate',      label: 'Date of Baptism (optional)', type: 'date', optional: true },
        { key: 'father',           label: 'Name of Father' },
        { key: 'mother',           label: 'Name of Mother' },
    ]),
    confirmation: req([
        { key: 'name',             label: 'Name' },
        { key: 'gender',           label: 'Gender', type: 'select', options: ['Male', 'Female'] },
        { key: 'birthDate',        label: 'Date of Birth',  type: 'date' },
        { key: 'birthPlace',       label: 'Place of Birth' },
        { key: 'confirmationDate', label: 'Date of Confirmation', type: 'date' },
        { key: 'father',           label: 'Name of Father' },
        { key: 'mother',           label: 'Name of Mother' },
    ]),
    marriage: req([
        { key: 'groom',         label: 'Name of Groom' },
        { key: 'bride',         label: 'Name of Bride' },
        { key: 'marriageDate',  label: 'Date of Marriage', type: 'date' },
        { key: 'marriagePlace', label: 'Place of Marriage' },
    ]),
    burial: req([
        { key: 'deceased',        label: 'Name of Deceased' },
        { key: 'parentsOrSpouse', label: 'Name of Parents or Spouse' },
        { key: 'deathDate',       label: 'Date of Death', type: 'date' },
        { key: 'interment',       label: 'Place of Interment' },
    ]),
};

/** Matches "Baptismal Certificate", "Certificate of Marriage", … by keyword. */
export function getDocumentFields(documentTypeName) {
    const key = String(documentTypeName || '').toLowerCase();
    if (!key) return [];
    // "Baptismal / Confirmation" names both — confirmation's slip is the fuller one
    if (key.includes('confirm')) return DOCUMENT_FIELDS.confirmation;
    if (key.includes('bapti'))   return DOCUMENT_FIELDS.baptism;
    if (key.includes('marri') || key.includes('wedding')) return DOCUMENT_FIELDS.marriage;
    if (key.includes('burial') || key.includes('death') || key.includes('funeral')) return DOCUMENT_FIELDS.burial;
    return [];
}

/** The first required field left blank, as a message — or null. */
export function missingDetail(fields, values) {
    const f = (fields || []).find(x => x.required && !String(values?.[x.key] || '').trim());
    return f ? `Enter the ${f.label.replace(/\s*\(.*\)$/, '').toLowerCase()}.` : null;
}
