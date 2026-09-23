import { feeLines, donationFrom, offeringProblem } from '../../utils/intentions';

const peso = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });

/**
 * What the intentions come to, line by line, and the chance to give more:
 * a box to tick, then the total the person will give — which cannot be
 * lower than what the parish asks. Whatever is above that is recorded as
 * a donation, apart from the offering.
 *
 * `items` the price list; `types`/`souls` the choices; `wants` whether
 * the box is ticked; `offering` the total typed.
 */
export default function OfferingStep({ items, types, souls, wants, offering, onWants, onOffering }) {
    const lines    = feeLines(items, types, souls);
    const fee      = lines.reduce((s, l) => s + l.amount, 0);
    const donation = wants ? donationFrom(fee, offering) : 0;
    const problem  = wants ? offeringProblem(fee, offering) : null;

    return (
        <>
            <div className="form-group form-group--full">
                <label className="form-label">Your offering</label>
                <div className="off-lines">
                    {lines.map(l => (
                        <div key={l.label} className="off-line">
                            <span className="off-line__label">{l.label}{l.detail && <small>{l.detail}</small>}</span>
                            <b>{l.amount ? peso(l.amount) : 'no offering'}</b>
                        </div>
                    ))}
                    <div className="off-line off-line--total">
                        <span className="off-line__label">Offering for the Mass</span>
                        <b>{peso(fee)}</b>
                    </div>
                </div>
            </div>

            <div className="form-group form-group--full">
                <label className="int-kind off-gift">
                    <input type="checkbox" checked={wants} onChange={e => onWants(e.target.checked)} />
                    <span className="int-kind__name">I would like to add a donation to the parish</span>
                </label>
            </div>

            {wants && (
                <div className="form-group form-group--full">
                    <label className="form-label">Total you will give <span className="req">*</span></label>
                    <div className="int-offering">
                        <span className="int-offering__sign">₱</span>
                        <input className="form-input" type="number" inputMode="decimal" min={fee} step="1"
                               value={offering} placeholder={fee.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                               onChange={e => onOffering(e.target.value)} autoFocus />
                    </div>
                    <p className={`form-hint${problem ? ' form-hint--error' : ''}`}>
                        {problem
                            ? problem
                            : donation > 0
                                ? <>Offering <b>{peso(fee)}</b> + donation <b>{peso(donation)}</b> = <b>{peso(fee + donation)}</b>. Thank you.</>
                                : <>Enter an amount above <b>{peso(fee)}</b> — the difference is your donation.</>}
                    </p>
                </div>
            )}
        </>
    );
}
