/**
 * Shared reading of the Church calendar feed (/user|/admin-api/liturgical).
 *
 * Both the devotee banner and the admin calendar render the same day, so the
 * colours and the wording live here rather than being written twice.
 */

/* Liturgical colours as the Church uses them, not as CSS names them.
   'black' would be unreadable as a dot, so it is rendered as deep grey. */
export const LITURGICAL_COLOUR = {
    white: '#e8e3d9', red: '#b3261e', green: '#1f6b4a',
    violet: '#6b4a86', rose: '#d98ba6', black: '#3a3a3a',
};

/* Only days that actually mean something get a label in a calendar grid — a
   plain ferial weekday would just add noise to every cell. */
export const SHOW_IN_GRID = new Set(['Primary liturgical days', 'solemnity', 'feast', 'memorial']);

/** Local calendar day as "YYYY-MM-DD" — the key the feed is indexed by. */
export const isoKey = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The swatch to paint, falling back to whatever the API said. */
export const colourOf = c => LITURGICAL_COLOUR[c] || c || 'transparent';

const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : '');

/** "Violet", for the label beside the swatch. */
export const colourName = c => cap(c);

/** "Ordinary Week 3", "Lent Week 2", or just the season if it has no weeks. */
export const seasonLabel = lit => {
    if (!lit?.season) return '';
    const week = lit.seasonWeek;
    return week ? `${cap(lit.season)} Week ${week}` : cap(lit.season);
};

/**
 * What to print as the day's celebration: the title with its rank, or a plain
 * note that nothing is kept — never an empty gap in the strip.
 */
export const celebrationLabel = lit => {
    if (!lit) return '';
    if (!lit.title) return 'Ferial day';
    // On an ordinary weekday the API titles the day after the season it is
    // already in — "Friday, 22nd week in Ordinary Time". Tagging that
    // "(Ferial)" beside a season that reads "Ordinary Week 22" says the same
    // thing three times.
    if (lit.rank === 'ferial') return lit.title;
    return lit.rank ? `${lit.title} (${cap(lit.rank)})` : lit.title;
};
