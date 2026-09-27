/** Shared display formatting for the admin tables. */

export const fmtDate = value => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? '—'
        : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const fmtDateTime = (value, time) => {
    const date = fmtDate(value);
    return time ? `${date} · ${fmtTime(time)}` : date;
};

/** A timestamp with its own time of day — "Sep 18, 2026 · 2:30 PM" — for when something was booked. */
export const fmtStamp = value => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return `${fmtDate(d)} · ${d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}`;
};

/**
 * The placeholder for a field that has none of its own: "Enter the …",
 * from its label — "Child's Full Name" → "Enter the child's full name".
 * A note in brackets ("(optional)") is left off.
 */
export const enterPlaceholder = label => {
    const what = String(label || '').replace(/\s*\(optional\)\s*$/i, '').trim();
    return what ? `Enter the ${what.charAt(0).toLowerCase()}${what.slice(1).toLowerCase()}` : '';
};

/** "14:30" → "2:30 PM". Leaves anything unparseable untouched. */
export const fmtTime = value => {
    if (!value) return '';
    const [h, m] = String(value).split(':');
    const hour = parseInt(h, 10);
    if (Number.isNaN(hour)) return value;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:${m ?? '00'} ${suffix}`;
};

export const fmtPeso = amount =>
    `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** "2 minutes ago", falling back to a date once the entry gets old. */
export const relativeTime = value => {
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return '—';

    const seconds = Math.round((Date.now() - then) / 1000);
    if (seconds < 60)     return `${Math.max(seconds, 0)}s ago`;
    if (seconds < 3600)   return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400)  return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return fmtDate(value);
};

/**
 * The filename the server asked for, out of a Content-Disposition header.
 *
 * A download built from a blob is named by the browser, not the server, so
 * without this the file on disk is whatever the calling component made up —
 * which is how a receipt numbered MS26-000-0022 came to be saved as
 * receipt-2FD79C5E.pdf. Falls back to the caller's name if the header is
 * missing, as it is on a cross-origin response that does not expose it.
 */
export const fileNameFrom = (headers, fallback) => {
    const cd = headers?.['content-disposition'] || headers?.get?.('content-disposition') || '';
    const star  = /filename\*=UTF-8''([^;]+)/i.exec(cd);
    const plain = /filename="?([^";]+)"?/i.exec(cd);
    const name  = star ? decodeURIComponent(star[1]) : plain?.[1];
    return name ? name.trim() : fallback;
};

/** Last 6 characters of a Mongo ObjectId — enough to identify a row by eye. */
export const shortId = id => (id ? `#${String(id).slice(-6)}` : '—');

/**
 * What the office calls a row: the booking's reference — MS26-000-0036,
 * the number on the parishioner's email, page and receipt, the one they
 * read out at the counter. A booking and its payment both carry it.
 *
 * A walk-in or a signed-in parishioner's booking was never given one, and
 * falls back to the short record ID so the row is still named.
 */
export const refOf = row => row?.guest?.reference || shortId(row?._id);

export const fullName = user =>
    user ? [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username || '—' : '—';

/** YYYY-MM-DD in local time — for <input type="date"> round-trips. */
export const toDateInput = value => {
    const d = value ? new Date(value) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
