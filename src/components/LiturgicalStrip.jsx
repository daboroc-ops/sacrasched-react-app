import useLiturgicalDay from '../hooks/useLiturgicalDay';
import { colourOf, colourName, seasonLabel, celebrationLabel } from '../utils/liturgical';

/**
 * Today in the Church calendar — season, celebration, liturgical colour.
 *
 * It sits with the calendar rather than in the masthead: it is calendar
 * information, and on the booking or profile tabs it was just a line of text
 * with nothing to do with the page under it.
 *
 * Renders nothing at all while it loads, or if the upstream calendar is
 * unreachable — a half-empty strip is worse than none.
 */
export default function LiturgicalStrip() {
    const lit = useLiturgicalDay();
    if (!lit) return null;

    return (
        <div className="lit-strip">
            <span className="lit-strip__season">{seasonLabel(lit)}</span>
            <span className="lit-strip__title">{celebrationLabel(lit)}</span>
            <span className="lit-strip__colour">
                {colourName(lit.colour)}
                <i className="lit-strip__swatch" style={{ background: colourOf(lit.colour) }} />
            </span>
        </div>
    );
}
