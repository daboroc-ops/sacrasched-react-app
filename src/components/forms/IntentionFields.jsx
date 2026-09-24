import {
    isNamedSouls, payableSouls, needsForWhom, soulsFor, soulsShape,
    splitSouls, isForSouls, MAX_SOULS,
} from '../../utils/intentions';

/**
 * What a Mass intention is for — the same questions on the guest form and
 * the devotee's:
 *
 *   • the kinds of intention, ticked — as many as apply (thanksgiving and
 *     good health for the same person, say). The offerings are shown on
 *     the next step, not here;
 *   • a name for each kind that wants one. A booking may carry several
 *     kinds at once, and the parish needs to read which name was offered
 *     for which: the Thanksgiving is for one person, the Good Health for
 *     another. So each ticked kind gets its own field rather than the
 *     single "for whom" line they used to share;
 *   • the departed by name ("For the soul of") — counted as individual
 *     souls and as couples side by side, each with its own number, both
 *     starting at none. A family books both: a mother, and grandparents.
 *     Each soul is one offering; a couple is one. "All Souls in
 *     Purgatory" names nobody, so it asks nothing;
 *   • the purpose, for the departed — the 40th day, an anniversary.
 *
 * `items` is the parish's price list for intentions [{ name, fee }].
 * `types` is the chosen kinds; `souls` [{ name, spouseOfPrevious }] (a
 * couple is two entries, the second marked); `names` is { [kind]: name }.
 */
export default function IntentionFields({
    items = [], types = [], souls = [], names = {}, purpose = '',
    onTypes, onSouls, onNames, onPurpose,
}) {
    const named = types.some(isNamedSouls);
    const plain = needsForWhom(types);

    const toggle = name => onTypes(types.includes(name) ? types.filter(t => t !== name) : [...types, name]);

    /* How many individuals and how many couples are asked for now */
    const { individuals, couples } = soulsShape(souls);
    const parts = splitSouls(souls);

    const reshape = (nI, nC) => onSouls(soulsFor(nI, nC, souls));

    /* The souls list is flat; these find the right entry to write into */
    const setIndividual = (i, value) => {
        const next = souls.slice();
        let seen = -1;
        for (let k = 0; k < next.length; k += 1) {
            if (next[k].spouseOfPrevious || next[k + 1]?.spouseOfPrevious) {
                if (next[k + 1]?.spouseOfPrevious) k += 1;      // skip the pair
                continue;
            }
            seen += 1;
            if (seen === i) { next[k] = { ...next[k], name: value }; break; }
        }
        onSouls(next);
    };
    const setCouple = (c, half, value) => {
        const next = souls.slice();
        let seen = -1;
        for (let k = 0; k < next.length; k += 1) {
            if (!next[k + 1]?.spouseOfPrevious) continue;
            seen += 1;
            if (seen === c) { next[k + half] = { ...next[k + half], name: value }; break; }
            k += 1;
        }
        onSouls(next);
    };

    const setName = (type, value) => onNames?.({ ...names, [type]: value });

    /* Every ticked kind that wants a name of its own */
    const wantsName = types.filter(t => t && !isForSouls(t));

    return (
        <>
            <div className="form-group form-group--full">
                <label className="form-label">Intentions <span className="req">*</span></label>
                {items.length > 0 ? (
                    <div className="int-kinds">
                        {items.map(t => (
                            <label key={t.name} className={`int-kind${types.includes(t.name) ? ' int-kind--on' : ''}`}>
                                <input type="checkbox" checked={types.includes(t.name)} onChange={() => toggle(t.name)} />
                                <span>{t.name}</span>
                            </label>
                        ))}
                    </div>
                ) : (
                    <input className="form-input" value={types[0] || ''} onChange={e => onTypes(e.target.value ? [e.target.value] : [])}
                           placeholder="The kind of intention" />
                )}
            </div>

            {/* One name per kind, so the parish reads which is which */}
            {plain && wantsName.map(type => (
                <div key={type} className="form-group form-group--full">
                    <label className="form-label">{type} — for whom <span className="req">*</span></label>
                    <input className="form-input" value={names[type] || ''}
                           onChange={e => setName(type, e.target.value)}
                           placeholder={`Who the ${type.toLowerCase()} is offered for`} />
                </div>
            ))}

            {named && (
                <>
                    <div className="form-group">
                        <label className="form-label">How many individual souls?</label>
                        <input className="form-input" type="number" min={0} max={MAX_SOULS} value={individuals}
                               onChange={e => reshape(Math.max(0, Math.min(MAX_SOULS, parseInt(e.target.value, 10) || 0)), couples)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">How many couples (mag-asawa)?</label>
                        <input className="form-input" type="number" min={0} max={Math.floor(MAX_SOULS / 2)} value={couples}
                               onChange={e => reshape(individuals, Math.max(0, Math.min(Math.floor(MAX_SOULS / 2), parseInt(e.target.value, 10) || 0)))} />
                    </div>

                    {(individuals > 0 || couples > 0) && (
                        <div className="form-group form-group--full">
                            <label className="form-label">For the repose of the soul of <span className="req">*</span></label>

                            {individuals > 0 && (
                                <div className="souls">
                                    <span className="souls__heading">Individual souls</span>
                                    {parts.individuals.map((s, i) => (
                                        <div key={`i${i}`} className="souls__row">
                                            <input className="form-input" value={s?.name || ''} placeholder={`Name ${i + 1}`}
                                                   onChange={e => setIndividual(i, e.target.value)} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {couples > 0 && (
                                <div className="souls">
                                    <span className="souls__heading">Couples</span>
                                    {parts.couples.map(([h, w], c) => (
                                        <div key={`c${c}`} className="souls__couple">
                                            <span className="souls__tag">Couple {c + 1}</span>
                                            <input className="form-input" value={h?.name || ''} placeholder="Husband's name"
                                                   onChange={e => setCouple(c, 0, e.target.value)} />
                                            <input className="form-input" value={w?.name || ''} placeholder="Wife's name"
                                                   onChange={e => setCouple(c, 1, e.target.value)} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="form-hint">
                                Each soul is one offering; a married couple, both departed, is one.
                                {' '}These come to <b>{payableSouls(souls)}</b> offering{payableSouls(souls) === 1 ? '' : 's'}.
                            </p>
                        </div>
                    )}

                    <div className="form-group form-group--full">
                        <label className="form-label">Purpose</label>
                        <input className="form-input" value={purpose} onChange={e => onPurpose?.(e.target.value)}
                               placeholder="e.g. 40th day, 1st death anniversary, birthday" maxLength={120} />
                    </div>
                </>
            )}
        </>
    );
}
