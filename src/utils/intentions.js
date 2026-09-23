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
 * The souls for a choice of "individual" or "couple" and a count, keeping
 * the names already typed. A couple is two entries, the second marked as
 * the spouse of the first — the shape the API and the fee already know.
 */
export function soulsFor(mode, count, existing = []) {
    const names = existing.map(s => s?.name || '');
    if (mode === 'couple') {
        const n = Math.min(Math.floor(MAX_SOULS / 2), Math.max(1, count || 1));
        return Array.from({ length: n * 2 }, (_, i) => ({ name: names[i] || '', spouseOfPrevious: i % 2 === 1 }));
    }
    const n = Math.min(MAX_SOULS, Math.max(1, count || 1));
    return Array.from({ length: n }, (_, i) => ({ name: names[i] || '', spouseOfPrevious: false }));
}

/** What shape a list of souls is in: { mode, count } — couples when every second one is a spouse. */
export function soulsShape(souls) {
    const list = souls || [];
    const couple = list.length >= 2 && list.length % 2 === 0 && list.every((s, i) => Boolean(s?.spouseOfPrevious) === (i % 2 === 1));
    return couple ? { mode: 'couple', count: list.length / 2 } : { mode: 'individual', count: Math.max(1, list.length) };
}

/** The first missing name, as a message — or null when every soul is named. */
export function soulsProblem(souls) {
    const { mode } = soulsShape(souls);
    if (!(souls || []).length)              return 'Enter at least one name.';
    if (souls.some(s => !s.name.trim()))   return mode === 'couple' ? 'Fill in both names of every couple.' : 'Fill in every name.';
    return null;
}
