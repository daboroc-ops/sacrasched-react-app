/**
 * Mass intentions: several kinds at once, several souls for the departed,
 * and what that comes to — the same sums the API works out from the
 * parish's price list, so the form can show them before sending.
 */

/** Is this kind of intention one offered for the departed? */
export const isForSouls = typeName => /soul|departed|deceased|eternal repose|\brip\b/i.test(String(typeName || ''));

/** "All Souls in Purgatory": for the departed, but for no one by name — one offering, no names asked. */
export const isAllSouls = typeName => /purgatory|all souls/i.test(String(typeName || ''));

/** Is this kind offered for the departed by name — priced per soul, names asked? */
export const isNamedSouls = typeName => isForSouls(typeName) && !isAllSouls(typeName);

/** How many offerings a list of souls comes to — a spouse shares the one before. */
export const payableSouls = souls => (souls || []).reduce((n, s) => n + (s?.spouseOfPrevious ? 0 : 1), 0);

/**
 * @param {object[]} items   the parish's intention kinds [{ name, fee }]
 * @param {string[]} types   the kinds chosen
 * @param {object[]} souls   [{ name, spouseOfPrevious }]
 */
export function intentionFee(items, types, souls) {
    const names = payableSouls(souls) || 1;
    return (types || []).reduce((sum, t) => {
        const fee = Number((items || []).find(i => i.name === t)?.fee) || 0;
        return sum + (isNamedSouls(t) ? fee * names : fee);
    }, 0);
}

/** The largest list of souls a form offers */
export const MAX_SOULS = 10;

/** Do the chosen kinds need a plain "for whom" — any kind not for the departed? */
export const needsForWhom = types => (types || []).some(t => t && !isForSouls(t));

/** The gift above the parish's amount, from the total the person typed */
export function donationFrom(fee, offering) {
    const total = Number(offering);
    return Number.isFinite(total) && total > fee ? Math.round((total - fee) * 100) / 100 : 0;
}

/** What is paid: the fee, plus the gift if one was chosen */
export function amountDue(fee, offering, wantsDonation = true) {
    return fee + (wantsDonation ? donationFrom(fee, offering) : 0);
}

/**
 * The offering, line by line — each kind with its fee, the departed priced
 * per name — for the step that shows what the choices come to.
 */
export function feeLines(items, types, souls) {
    const names = payableSouls(souls) || 1;
    return (types || []).filter(Boolean).map(t => {
        const fee = Number((items || []).find(i => i.name === t)?.fee) || 0;
        const perSoul = isNamedSouls(t);
        return {
            label:  t,
            detail: perSoul && names > 1 ? `${names} offerings × ${'₱' + fee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '',
            amount: perSoul ? fee * names : fee
        };
    });
}

/** Why an offering amount cannot be used, or null when it is fine. */
export function offeringProblem(fee, offering) {
    if (offering === '' || offering == null) return null;
    const n = Number(offering);
    if (!Number.isFinite(n) || n < 0) return 'Enter the amount as a number.';
    if (n < fee) return `The offering cannot be less than ${'₱' + fee.toLocaleString('en-PH', { minimumFractionDigits: 2 })} for what you chose.`;
    return null;
}

/** A list of N souls, keeping the names already typed */
export const resizeSouls = (souls, n) =>
    Array.from({ length: Math.min(MAX_SOULS, Math.max(1, n)) }, (_, i) => souls[i] || { name: '', spouseOfPrevious: false });

/**
 * The souls for a number of individuals and a number of couples, keeping
 * the names already typed.
 *
 * Both at once, because a family books both: "for my mother, and for my
 * grandparents". Individuals come first, then the couples in pairs, the
 * second of each marked as sharing the offering before it — the shape the
 * fee and the API already read.
 */
export function soulsFor(individuals, couples, existing = []) {
    const was = splitSouls(existing);
    const nI = Math.max(0, Math.min(MAX_SOULS, individuals || 0));
    const nC = Math.max(0, Math.min(Math.floor(MAX_SOULS / 2), couples || 0));

    const out = [];
    for (let i = 0; i < nI; i += 1) {
        out.push({ name: was.individuals[i]?.name || '', spouseOfPrevious: false });
    }
    for (let c = 0; c < nC; c += 1) {
        out.push({ name: was.couples[c]?.[0]?.name || '', spouseOfPrevious: false });
        out.push({ name: was.couples[c]?.[1]?.name || '', spouseOfPrevious: true });
    }
    return out;
}

/**
 * A flat list of souls read back as what it is: the individuals, and the
 * couples as pairs. A soul marked spouseOfPrevious belongs to the one
 * before it; everything else stands alone.
 */
export function splitSouls(souls) {
    const list = souls || [];
    const individuals = [];
    const couples = [];
    for (let i = 0; i < list.length; i += 1) {
        if (list[i + 1]?.spouseOfPrevious) { couples.push([list[i], list[i + 1]]); i += 1; }
        else if (!list[i]?.spouseOfPrevious) individuals.push(list[i]);
    }
    return { individuals, couples };
}

/** How many of each a list holds: { individuals, couples }. */
export function soulsShape(souls) {
    const { individuals, couples } = splitSouls(souls);
    return { individuals: individuals.length, couples: couples.length };
}

/** The first missing name, as a message — or null when every soul is named. */
export function soulsProblem(souls) {
    const list = souls || [];
    if (!list.length) return 'Add at least one soul or couple.';

    const { couples } = splitSouls(list);
    if (couples.some(([a, b]) => !a?.name?.trim() || !b?.name?.trim())) {
        return 'Fill in both names of every couple.';
    }
    if (list.some(s => !s?.name?.trim())) return 'Fill in every name.';
    return null;
}

/**
 * Which name was offered for which kind.
 *
 * A booking may carry several kinds at once, and until now they shared one
 * "for whom" line, so there was no telling whether the name belonged to the
 * Thanksgiving or to the Good Health. Each kind keeps its own name here.
 *
 * "All Souls in Purgatory" is left out on purpose: it is offered for the
 * departed generally and asks for nobody by name. The departed by name are
 * the souls list, which is grouped separately.
 *
 * @param {string[]} types  the kinds chosen
 * @param {object}   names  { [kind]: name }
 * @returns {{type: string, name: string}[]}
 */
export function namedIntentions(types, names = {}) {
    return (types || [])
        .filter(t => t && !isForSouls(t))
        .map(type => ({ type, name: String(names?.[type] || '').trim() }));
}

/** The kinds that still want a name typed into them. */
export function missingIntentionNames(types, names = {}) {
    return namedIntentions(types, names).filter(x => !x.name).map(x => x.type);
}

/** The one-line summary kept for search and for older bookings. */
export function summariseIntentions(types, names = {}, souls = []) {
    const parts = namedIntentions(types, names).filter(x => x.name).map(x => `${x.type}: ${x.name}`);
    const { individuals, couples } = splitSouls(souls);
    const departed = [...individuals.map(s => s?.name), ...couples.map(([a, b]) => `${a?.name} & ${b?.name}`)]
        .filter(Boolean);
    if (departed.length) parts.push(`For the soul of: ${departed.join(', ')}`);
    return parts.join('  ·  ');
}

/**
 * A saved booking as the parish reads it: every kind with the names
 * offered for it. Mirrors utils/fees.intentionGroups on the server, so the
 * screen, the invoice, the receipt and the printed sheet agree.
 */
export function intentionGroups(doc = {}) {
    const kinds = (doc.intentionTypes?.length ? doc.intentionTypes : String(doc.intentionType || '').split(','))
        .map(k => String(k || '').trim()).filter(Boolean);

    const paired = Object.fromEntries(
        (Array.isArray(doc.intentionNames) ? doc.intentionNames : [])
            .filter(Boolean).map(p => [String(p.type || ''), String(p.name || '')]));

    const legacy = String(doc.intentionFor || '').trim();

    return kinds.map(type => {
        if (isAllSouls(type)) return { type, names: [], allSouls: true };

        if (isForSouls(type)) {
            const { individuals, couples } = splitSouls(doc.souls);
            const names = [
                ...individuals.map(s => s?.name),
                ...couples.map(([a, b]) => [a?.name, b?.name].filter(Boolean).join(' & ')),
            ].filter(Boolean);
            return { type, names: names.length ? names : (legacy ? [legacy] : []), allSouls: false };
        }

        const name = paired[type];
        if (!name && kinds.length === 1 && legacy) return { type, names: [legacy], allSouls: false };
        return { type, names: name ? [name] : [], allSouls: false };
    });
}
