import { isNamedSouls, payableSouls, needsForWhom, soulsFor, soulsShape, MAX_SOULS } from '../../utils/intentions';

/**
 * What a Mass intention is for — the same questions on the guest form and
 * the devotee's:
 *
 *   • the kinds of intention, ticked — as many as apply (thanksgiving and
 *     good health for the same person, say). The offerings are shown on
 *     the next step, not here;
 *   • for whom — when a kind is for the departed by name ("For the soul
 *     of"), whether it is for individual souls or for couples, how many,
 *     and then the names: one field per soul, or a pair per couple. Each
 *     soul is one offering; a couple is one. "All Souls in Purgatory"
 *     names no one, so asks nothing. Any other kind asks for a plain
 *     "for whom". Both show when the kinds are mixed;
 *   • the purpose, for the departed — the 40th day, an anniversary.
 *
 * `items` is the parish's price list for intentions [{ name, fee }].
 * `types` is the chosen kinds; `souls` [{ name, spouseOfPrevious }] (a
 * couple is two entries, the second marked); `forWhom` the plain name.
 */
export default function IntentionFields({
    items = [], types = [], souls = [], forWhom = '', purpose = '',
    onTypes, onSouls, onForWhom, onPurpose
}) {
    const named = types.some(isNamedSouls);
    const plain = needsForWhom(types);

    const toggle = name => onTypes(types.includes(name) ? types.filter(t => t !== name) : [...types, name]);

    // What the list of souls is shaped as now: individual or couple, and how many
    const { mode, count } = soulsShape(souls);
    const maxCount = mode === 'couple' ? Math.floor(MAX_SOULS / 2) : MAX_SOULS;
    const list = souls.length ? souls : soulsFor('individual', 1, []);
    const setName = (i, name) => onSouls(list.map((s, j) => (j === i ? { ...s, name } : s)));
    const reshape = (m, n) => onSouls(soulsFor(m, n, list));

    return (
        <>
            <div className="form-group form-group--full">
                <label className="form-label">Intentions <span className="req">*</span></label>
                {items.length ? (
                    <div className="int-kinds">
                        {items.map(t => (
                            <label key={t.name} className={`int-kind${types.includes(t.name) ? ' int-kind--on' : ''}`}>
                                <input type="checkbox" checked={types.includes(t.name)} onChange={() => toggle(t.name)} />
                                <span className="int-kind__name">{t.name}</span>
                            </label>
                        ))}
                    </div>
                ) : (
                    <input className="form-input" value={types[0] || ''} onChange={e => onTypes(e.target.value ? [e.target.value] : [])}
                           placeholder="Enter your intention" />
                )}
                <p className="form-hint">Tick every kind that applies.</p>
            </div>

            {named && (
                <>
                    <div className="form-group">
                        <label className="form-label">Offered for <span className="req">*</span></label>
                        <select className="form-select" value={mode} onChange={e => reshape(e.target.value, count)}>
                            <option value="individual">Individual soul(s)</option>
                            <option value="couple">Couple (mag-asawa)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">How many {mode === 'couple' ? 'couples' : 'souls'}? <span className="req">*</span></label>
                        <input className="form-input" type="number" min={1} max={maxCount} value={count}
                               onChange={e => reshape(mode, Math.min(maxCount, Math.max(1, parseInt(e.target.value, 10) || 1)))} />
                    </div>

                    <div className="form-group form-group--full">
                        <label className="form-label">For the repose of the soul of <span className="req">*</span></label>
                        <div className="souls">
                            {mode === 'couple'
                                ? Array.from({ length: count }, (_, c) => (
                                    <div key={c} className="souls__couple">
                                        <span className="souls__tag">Couple {c + 1}</span>
                                        <input className="form-input" value={list[c * 2]?.name || ''} placeholder="Husband's name"
                                               onChange={e => setName(c * 2, e.target.value)} />
                                        <input className="form-input" value={list[c * 2 + 1]?.name || ''} placeholder="Wife's name"
                                               onChange={e => setName(c * 2 + 1, e.target.value)} />
                                    </div>
                                ))
                                : list.map((s, i) => (
                                    <div key={i} className="souls__row">
                                        <input className="form-input" value={s.name} placeholder={`Name ${i + 1}`}
                                               onChange={e => setName(i, e.target.value)} />
                                    </div>
                                ))}
                        </div>
                        <p className="form-hint">
                            {mode === 'couple' ? 'A married couple, both departed, is one offering.' : 'Each soul is one offering.'}
                            {count > 1 && <> These come to <b>{payableSouls(list)}</b> offering{payableSouls(list) === 1 ? '' : 's'}.</>}
                        </p>
                    </div>

                    <div className="form-group form-group--full">
                        <label className="form-label">Purpose</label>
                        <input className="form-input" value={purpose} onChange={e => onPurpose?.(e.target.value)}
                               placeholder="e.g. 40th day, 1st death anniversary, birthday" maxLength={120} />
                    </div>
                </>
            )}

            {plain && (
                <div className="form-group form-group--full">
                    <label className="form-label">For whom <span className="req">*</span></label>
                    <input className="form-input" value={forWhom} onChange={e => onForWhom(e.target.value)}
                           placeholder="The person or family the Mass is offered for" />
                </div>
            )}
        </>
    );
}
