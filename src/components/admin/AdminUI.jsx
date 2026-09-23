/**
 * Small presentational pieces shared by every admin page:
 * status badges, filter bar, pagination, modal, confirm dialog,
 * toast banner and the dependency-free SVG charts.
 */
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faChevronLeft, faChevronRight, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { TableSkeleton } from '../Skeleton';

/* ── Status badge ────────────────────────────────────────────── */
const TONE = {
    pending:   'warn',
    approved:  'ok',
    completed: 'info',
    rejected:  'bad',
    cancelled: 'bad',
    paid:      'ok',
    failed:    'bad',
    refunded:  'muted',
    published: 'ok',
    draft:     'muted',
};

export function StatusBadge({ status }) {
    return (
        <span className={`ad-badge ad-badge--${TONE[status] || 'muted'}`}>
            {status || 'unknown'}
        </span>
    );
}

/* ── Filter bar ──────────────────────────────────────────────── */
/**
 * The search bar over a list: type, press Enter (or Search), and the list
 * asks the API again with ?search=. Clear puts everything back.
 */
export function SearchBox({ value, onSearch, placeholder = 'Search…' }) {
    const [query, setQuery] = useState(value || '');
    return (
        <form className="ad-search" onSubmit={e => { e.preventDefault(); onSearch(query.trim()); }} role="search">
            <span className="ad-search__field">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="ad-search__icon" />
                <input className="ad-input ad-input--search" placeholder={placeholder} value={query}
                       onChange={e => setQuery(e.target.value)} aria-label={placeholder} />
            </span>
            <button className="ad-btn ad-btn--filled ad-btn--sm" type="submit">Search</button>
            {value && (
                <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm"
                        onClick={() => { setQuery(''); onSearch(''); }}>
                    Clear
                </button>
            )}
        </form>
    );
}

export function FilterBar({ options, value, onChange, counts = {}, total }) {
    return (
        <div className="ad-filters">
            {options.map(opt => {
                const count = opt === 'all' ? total : counts[opt];
                return (
                    <button
                        key={opt}
                        className={`ad-filter ${value === opt ? 'ad-filter--active' : ''}`}
                        onClick={() => onChange(opt)}
                    >
                        {opt === 'all' ? 'All' : opt}
                        {count != null && <span className="ad-filter__count">{count}</span>}
                    </button>
                );
            })}
        </div>
    );
}

/* ── Tabs ────────────────────────────────────────────────────── */
/**
 * The tabs over a list — All, then one per kind of request — with how
 * many rows each holds. Underlined rather than pills, so they read apart
 * from the status filter beneath them.
 */
export function Tabs({ tabs, value, onChange, counts = {}, total }) {
    const tab = (key, label, count) => (
        <button type="button" role="tab" key={key} aria-selected={value === key}
                className={`ad-tab ${value === key ? 'ad-tab--active' : ''}`} onClick={() => onChange(key)}>
            {label}{count != null && <span className="ad-tab__count">{count}</span>}
        </button>
    );
    return (
        <div className="ad-tabs" role="tablist">
            {tab('all', 'All', total)}
            {tabs.map(t => tab(t.match, t.label, counts[t.match]))}
        </div>
    );
}

/** A row of choices where exactly one is on — Day / Week / Month / Year. */
export function Segmented({ options, value, onChange, label }) {
    return (
        <div className="ad-seg" role="radiogroup" aria-label={label}>
            {options.map(o => (
                <button type="button" role="radio" key={o.value} aria-checked={value === o.value}
                        className={`ad-seg__btn ${value === o.value ? 'ad-seg__btn--active' : ''}`}
                        onClick={() => onChange(o.value)}>
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/* ── Pagination ──────────────────────────────────────────────── */
export function Pagination({ page, totalPages, total, onChange }) {
    if (totalPages <= 1) return <p className="ad-pagination__meta">{total} record{total === 1 ? '' : 's'}</p>;

    // Window of at most 5 page numbers around the current page
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);

    return (
        <div className="ad-pagination">
            <span className="ad-pagination__meta">
                Page {page} of {totalPages} · {total} record{total === 1 ? '' : 's'}
            </span>
            <div className="ad-pagination__pages">
                <button className="ad-page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                {pages.map(p => (
                    <button
                        key={p}
                        className={`ad-page-btn ${p === page ? 'ad-page-btn--active' : ''}`}
                        onClick={() => onChange(p)}
                    >
                        {p}
                    </button>
                ))}
                <button className="ad-page-btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
                    <FontAwesomeIcon icon={faChevronRight} />
                </button>
            </div>
        </div>
    );
}

/* ── Modal ───────────────────────────────────────────────────── */
export function Modal({ title, onClose, children, wide = false }) {
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="ad-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={`ad-modal ${wide ? 'ad-modal--wide' : ''}`} role="dialog" aria-modal="true">
                <header className="ad-modal__head">
                    <h3>{title}</h3>
                    <button className="ad-icon-btn" onClick={onClose} aria-label="Close">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </header>
                <div className="ad-modal__body">{children}</div>
            </div>
        </div>
    );
}

/* ── Confirm dialog ──────────────────────────────────────────── */
export function ConfirmDialog({ title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
    return (
        <Modal title={title} onClose={onCancel}>
            <p className="ad-confirm__text">{message}</p>
            <div className="ad-form__actions">
                <button className="ad-btn ad-btn--ghost" onClick={onCancel} disabled={busy}>Cancel</button>
                <button className="ad-btn ad-btn--danger" onClick={onConfirm} disabled={busy}>
                    {busy ? 'Working…' : confirmLabel}
                </button>
            </div>
        </Modal>
    );
}

/* ── Toast banner ────────────────────────────────────────────── */
export function Banner({ tone = 'ok', message, onDismiss }) {
    if (!message) return null;
    return (
        <div className={`ad-banner ad-banner--${tone}`}>
            <span>{message}</span>
            {onDismiss && (
                <button className="ad-icon-btn" onClick={onDismiss} aria-label="Dismiss">
                    <FontAwesomeIcon icon={faXmark} />
                </button>
            )}
        </div>
    );
}

/* ── States ──────────────────────────────────────────────────── */
/* Shaped placeholders rather than a line of text — see components/Skeleton.jsx.
   Every admin screen calls this, so they all gained skeletons at once. */
export const Loading = ({ label = 'Loading…', rows = 6, cols = 5 }) => <TableSkeleton rows={rows} cols={cols} label={label} />;
export const ErrorText = ({ children }) => <p className="ad-state ad-state--error">{children}</p>;
export const Empty = ({ children = 'Nothing here yet.' }) => <p className="ad-state">{children}</p>;

/* ═══ Charts — hand-rolled SVG, no charting dependency ═══════════ */

const PALETTE = ['#964B01', '#C49A6C', '#7A5030', '#C8900A', '#8C6239', '#D9B38C', '#5C3A1E', '#E0C9A6'];

/** Grouped bar chart — one group per month, one bar per series. */
export function GroupedBars({ labels, series, height = 190, formatValue = v => v }) {
    const max = Math.max(1, ...series.flatMap(s => s.data));
    const groups = labels.length;
    const barW = 100 / (groups * (series.length + 1));   // percentage widths keep it responsive

    return (
        <div className="ad-chart" style={{ height }}>
            <div className="ad-chart__plot">
                {labels.map((label, gi) => (
                    <div className="ad-chart__group" key={label}>
                        <div className="ad-chart__bars">
                            {series.map((s, si) => {
                                const v = s.data[gi] || 0;
                                return (
                                    <div
                                        key={s.label}
                                        className="ad-chart__bar"
                                        style={{
                                            height: `${(v / max) * 100}%`,
                                            width: `${barW}%`,
                                            background: s.color || PALETTE[si % PALETTE.length],
                                        }}
                                        title={`${s.label} · ${label}: ${formatValue(v)}`}
                                    />
                                );
                            })}
                        </div>
                        <span className="ad-chart__xlabel">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Line chart — one line per series over the same labels, for the trend
 * of bookings. Drawn to the width it is given (laid out again when the
 * card resizes) so the text stays crisp at any size. Hovering a column
 * lists every series' value there; a series can be dimmed from the
 * legend.
 */
export function LineChart({ labels, series, height = 240, formatValue = v => v }) {
    const ref = useRef(null);
    const [width,  setWidth]  = useState(640);
    const [hidden, setHidden] = useState(() => new Set());
    const [hover,  setHover]  = useState(null);      // index of the label under the pointer

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, Math.floor(e.contentRect.width))));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const colorOf = s => s.color || PALETTE[series.indexOf(s) % PALETTE.length];
    const shown = series.filter(s => !hidden.has(s.label));
    const max   = Math.max(1, ...shown.flatMap(s => s.data));
    // A round ceiling with a few even gridlines under it
    const step  = niceStep(max);
    const top   = Math.max(step, Math.ceil(max / step) * step);
    const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);

    const pad = { l: 36, r: 12, t: 12, b: 28 };
    const W = width, H = height, plotW = W - pad.l - pad.r;
    const x = i => pad.l + (labels.length < 2 ? plotW / 2 : (i * plotW) / (labels.length - 1));
    const y = v => H - pad.b - (v / top) * (H - pad.t - pad.b);
    const toggle = label => setHidden(h => { const n = new Set(h); if (n.has(label)) n.delete(label); else n.add(label); return n; });

    // Only every nth label when they would overlap
    const every = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor(plotW / 56))));
    const colW  = plotW / Math.max(1, labels.length - 1);

    return (
        <div className="ad-line" ref={ref}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bookings over time"
                 onMouseLeave={() => setHover(null)}>
                {ticks.map(t => (
                    <g key={t}>
                        <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="ad-line__grid" />
                        <text x={pad.l - 8} y={y(t) + 3.5} textAnchor="end" className="ad-line__tick">{formatValue(t)}</text>
                    </g>
                ))}
                {labels.map((l, i) => (
                    <g key={l + i}>
                        {i % every === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" className="ad-line__xlabel">{l}</text>}
                        {/* a wide invisible strip per label makes hovering easy */}
                        <rect x={x(i) - colW / 2} y={pad.t} width={colW} height={H - pad.t - pad.b}
                              fill="transparent" onMouseEnter={() => setHover(i)} />
                    </g>
                ))}
                {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="ad-line__cursor" />}
                {shown.map((s, si) => {
                    const color = colorOf(s);
                    const pts   = s.data.map((v, i) => `${x(i)},${y(v || 0)}`).join(' ');
                    const area  = `${x(0)},${y(0)} ${pts} ${x(s.data.length - 1)},${y(0)}`;
                    return (
                        <g key={s.label} style={{ pointerEvents: 'none' }}>
                            {si === 0 && <polygon points={area} fill={color} opacity=".07" />}
                            <polyline points={pts} fill="none" stroke={color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
                            {s.data.map((v, i) => (
                                <circle key={i} cx={x(i)} cy={y(v || 0)} r={hover === i ? 4.5 : 2.75} fill="#fff" stroke={color} strokeWidth="2" />
                            ))}
                        </g>
                    );
                })}
            </svg>

            {hover != null && (
                <div className="ad-line__tip" style={{ left: Math.min(Math.max(x(hover), 96), W - 96) }}>
                    <b>{labels[hover]}</b>
                    {shown.map(s => (
                        <span key={s.label}>
                            <i style={{ background: colorOf(s) }} />
                            {s.label} <b>{formatValue(s.data[hover] || 0)}</b>
                        </span>
                    ))}
                </div>
            )}

            <div className="ad-legend-row ad-legend-row--toggle">
                {series.map(s => (
                    <button type="button" key={s.label} onClick={() => toggle(s.label)}
                            className={`ad-legend-item ${hidden.has(s.label) ? 'ad-legend-item--off' : ''}`}
                            title={hidden.has(s.label) ? 'Show' : 'Hide'}>
                        <span className="ad-legend__dot" style={{ background: colorOf(s) }} />
                        {s.label}{s.total != null && <b>{formatValue(s.total)}</b>}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* 1, 2, 5, 10, 20, 50… — the gridline spacing that gives 3–6 lines */
function niceStep(max) {
    const raw = max / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(1, raw))));
    const n   = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

/** Horizontal bars — good for "which service is busiest" style breakdowns. */
export function HorizontalBars({ labels, data, formatValue = v => v }) {
    const max = Math.max(1, ...data);
    return (
        <div className="ad-hbars">
            {labels.map((label, i) => (
                <div className="ad-hbar" key={label}>
                    <span className="ad-hbar__label">{label}</span>
                    <div className="ad-hbar__track">
                        <div
                            className="ad-hbar__fill"
                            style={{ width: `${(data[i] / max) * 100}%`, background: PALETTE[i % PALETTE.length] }}
                        />
                    </div>
                    <span className="ad-hbar__value">{formatValue(data[i])}</span>
                </div>
            ))}
        </div>
    );
}

/** Donut chart with a legend — used for the sacrament-type split. */
export function Donut({ labels, data, size = 168 }) {
    const total = data.reduce((a, b) => a + b, 0);
    if (!total) return <Empty>No data yet.</Empty>;

    const r = size / 2 - 14;
    const c = 2 * Math.PI * r;

    // Each arc starts where the previous one ended
    const segments = data.reduce((acc, v) => {
        const prev = acc[acc.length - 1];
        const start = prev ? prev.start + prev.len : 0;
        return [...acc, { len: (v / total) * c, start }];
    }, []);

    return (
        <div className="ad-donut">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Breakdown by type">
                <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                    {segments.map((seg, i) => (
                        <circle
                            key={labels[i]}
                            cx={size / 2}
                            cy={size / 2}
                            r={r}
                            fill="none"
                            strokeWidth="18"
                            stroke={PALETTE[i % PALETTE.length]}
                            strokeDasharray={`${seg.len} ${c - seg.len}`}
                            strokeDashoffset={-seg.start}
                        />
                    ))}
                </g>
                <text x="50%" y="48%" textAnchor="middle" className="ad-donut__total">{total}</text>
                <text x="50%" y="61%" textAnchor="middle" className="ad-donut__caption">total</text>
            </svg>
            <ul className="ad-legend">
                {labels.map((label, i) => (
                    <li key={label}>
                        <span className="ad-legend__dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                        {label}
                        <b>{data[i]}</b>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function Legend({ items }) {
    return (
        <div className="ad-legend-row">
            {items.map((it, i) => (
                <span className="ad-legend-item" key={it.label}>
                    <span className="ad-legend__dot" style={{ background: it.color || PALETTE[i % PALETTE.length] }} />
                    {it.label}
                </span>
            ))}
        </div>
    );
}

export { PALETTE };
