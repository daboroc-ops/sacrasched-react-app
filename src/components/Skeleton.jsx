/**
 * Loading placeholders.
 *
 * A skeleton earns its place by being the shape of what is coming, so the
 * page does not jump when the data lands. That means each view builds its own
 * from these pieces rather than sharing one generic block.
 *
 * Everything here is decorative: the whole tree is hidden from assistive
 * technology and the real state is announced once, by the wrapper.
 */

/** One shimmering bar. Width/height take any CSS length. */
export function Skeleton({ w = '100%', h = 14, r = 6, className = '', style }) {
    return (
        <span
            className={`skel ${className}`}
            style={{ width: w, height: h, borderRadius: r, ...style }}
        />
    );
}

/**
 * Wraps a set of bars. Holds the politeness announcement so screen readers
 * hear "Loading X" once instead of walking a tree of empty spans.
 */
export function SkeletonBlock({ label = 'Loading…', children, className = '' }) {
    return (
        <div className={`skel-block ${className}`} role="status" aria-live="polite">
            <span className="skel-block__label">{label}</span>
            <div aria-hidden="true" className="skel-block__body">{children}</div>
        </div>
    );
}

/* ── Shaped presets ──────────────────────────────────────────── */

/** The month grid: nav, weekday header, then six weeks of cells. */
export function CalendarSkeleton({ strip = true, weeks = 5 }) {
    return (
        <SkeletonBlock label="Loading calendar…" className="skel-cal-wrap">
            {strip && (
                <div className="skel-cal__strip">
                    <Skeleton w={120} h={12} />
                    <Skeleton w={180} h={14} />
                    <Skeleton w={90} h={12} />
                </div>
            )}
            <Skeleton w={280} h={12} className="skel-cal__hint" />
            <div className="skel-cal">
                <div className="skel-cal__nav">
                    <div className="skel-cal__controls">
                        <Skeleton w={32} h={32} r={8} />
                        <Skeleton w={62} h={32} r={8} />
                        <Skeleton w={32} h={32} r={8} />
                    </div>
                    <Skeleton w={140} h={18} />
                </div>
                <div className="skel-cal__weekdays">
                    {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} w={28} h={9} />)}
                </div>
                <div className="skel-cal__grid">
                    {Array.from({ length: weeks * 7 }, (_, i) => (
                        <div key={i} className="skel-cal__cell">
                            <Skeleton w={18} h={11} />
                            {/* Only some days carry events, so only some cells
                                get a chip — an even grid reads as a table. */}
                            {i % 5 === 2 && <Skeleton w="82%" h={14} r={6} />}
                            {i % 9 === 4 && <Skeleton w="64%" h={14} r={6} />}
                        </div>
                    ))}
                </div>
            </div>
        </SkeletonBlock>
    );
}

/** The three weekday/Saturday/Sunday columns of Mass times. */
export function ScheduleSkeleton() {
    return (
        <SkeletonBlock label="Loading mass schedule…">
            <Skeleton w="58%" h={13} className="skel-intro" />
            <div className="skel-sched">
                {Array.from({ length: 3 }, (_, col) => (
                    <div key={col} className="skel-sched__card">
                        <div className="skel-sched__head">
                            <Skeleton w={26} h={26} r={8} />
                            <Skeleton w={92} h={14} />
                        </div>
                        {Array.from({ length: 3 }, (_, i) => (
                            <Skeleton key={i} w="100%" h={30} r={8} />
                        ))}
                    </div>
                ))}
            </div>
        </SkeletonBlock>
    );
}

/** Filter tabs above a stack of request cards. */
export function RequestsSkeleton({ rows = 4 }) {
    return (
        <SkeletonBlock label="Loading your requests…">
            <Skeleton w="52%" h={13} className="skel-intro" />
            <div className="skel-tabs">
                {[68, 84, 92, 84, 96].map((w, i) => <Skeleton key={i} w={w} h={32} r={99} />)}
            </div>
            <div className="skel-rows">
                {Array.from({ length: rows }, (_, i) => (
                    <div key={i} className="skel-row">
                        <div className="skel-row__main">
                            <Skeleton w="34%" h={14} />
                            <Skeleton w="56%" h={11} />
                        </div>
                        <Skeleton w={76} h={22} r={99} />
                    </div>
                ))}
            </div>
        </SkeletonBlock>
    );
}

/** The parish cards on the platform landing page. */
export function ParishDirectorySkeleton({ cards = 3 }) {
    return (
        <SkeletonBlock label="Loading parishes…">
            <div className="skel-parishes">
                {Array.from({ length: cards }, (_, i) => (
                    <div key={i} className="skel-parish">
                        <div className="skel-parish__banner">
                            <Skeleton w={46} h={46} r={12} className="skel-parish__badge" />
                            <div className="skel-parish__name">
                                <Skeleton w={i % 2 ? '78%' : '58%'} h={14} />
                                <Skeleton w="40%" h={10} />
                            </div>
                        </div>
                        <div className="skel-parish__body">
                            <Skeleton w="92%" h={11} />
                            <Skeleton w="58%" h={11} />
                            <Skeleton w="30%" h={11} />
                        </div>
                    </div>
                ))}
            </div>
        </SkeletonBlock>
    );
}

/** The hero carousel on the main page: one slide's frame, with its caption. */
export function CarouselSkeleton() {
    return (
        <SkeletonBlock label="Loading parishes…" className="skel-carousel">
            <div className="skel-carousel__frame">
                <div className="skel-carousel__dots">
                    <Skeleton w={22} h={8} r={99} />
                    <Skeleton w={8} h={8} r={99} />
                </div>
                <div className="skel-carousel__caption">
                    <Skeleton w={44} h={44} r={12} />
                    <div className="skel-carousel__name">
                        <Skeleton w="64%" h={15} />
                        <Skeleton w="82%" h={11} />
                    </div>
                </div>
            </div>
        </SkeletonBlock>
    );
}

/** The news cards on a parish page: a cover, then the date, title and a line or two. */
export function PostsSkeleton({ cards = 3 }) {
    return (
        <SkeletonBlock label="Loading news…">
            <div className="skel-posts">
                {Array.from({ length: cards }, (_, i) => (
                    <div key={i} className="skel-post">
                        <Skeleton w="100%" h="auto" r={0} className="skel-post__cover" />
                        <div className="skel-post__body">
                            <Skeleton w={96} h={10} />
                            <Skeleton w="86%" h={18} />
                            <Skeleton w="72%" h={18} />
                            <Skeleton w="100%" h={13} style={{ marginTop: 6 }} />
                            <Skeleton w="94%" h={13} />
                            <Skeleton w="64%" h={13} />
                            <Skeleton w={78} h={11} style={{ marginTop: 8 }} />
                        </div>
                    </div>
                ))}
            </div>
        </SkeletonBlock>
    );
}

/** A booking opened from its link: the parish banner, then the ticket. */
export function TicketSkeleton() {
    return (
        <SkeletonBlock label="Opening your booking…" className="skel-ticket-wrap">
            <Skeleton w="100%" h={112} r={18} className="skel-ticket__banner" />
            <div className="skel-ticket">
                <div className="skel-ticket__strip">
                    <Skeleton w={16} h={16} r={99} />
                    <Skeleton w={170} h={13} />
                    <span className="skel-lp__spacer" />
                    <Skeleton w={62} h={18} r={99} />
                </div>
                <div className="skel-ticket__body">
                    <Skeleton w={96} h={10} />
                    <Skeleton w="46%" h={22} r={6} />
                    <Skeleton w="34%" h={13} />
                    <div className="skel-ticket__when">
                        <Skeleton w={46} h={46} r={10} />
                        <div className="skel-ticket__lines">
                            <Skeleton w="58%" h={13} />
                            <Skeleton w="30%" h={12} />
                        </div>
                    </div>
                    <div className="skel-ticket__facts">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="skel-ticket__fact">
                                <Skeleton w={62} h={9} />
                                <Skeleton w="76%" h={13} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="skel-ticket__stub">
                    <div className="skel-ticket__lines">
                        <Skeleton w={70} h={9} />
                        <Skeleton w={260} h={13} />
                    </div>
                    <Skeleton w={74} h={30} r={99} />
                </div>
                <div className="skel-ticket__actions">
                    <Skeleton w={180} h={44} r={99} />
                    <Skeleton w={140} h={12} />
                </div>
            </div>
        </SkeletonBlock>
    );
}

/** An admin table: the header band, then rows of cells in the real columns. */
export function TableSkeleton({ rows = 6, cols = 5, label = 'Loading…' }) {
    const widths = ['62%', '48%', '70%', '38%', '52%', '44%', '58%'];
    return (
        <SkeletonBlock label={label}>
            <div className="skel-table">
                <div className="skel-table__head" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                    {Array.from({ length: cols }, (_, i) => <Skeleton key={i} w={widths[(i + 3) % widths.length]} h={9} />)}
                </div>
                {Array.from({ length: rows }, (_, r) => (
                    <div key={r} className="skel-table__row" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                        {Array.from({ length: cols }, (_, c) => (
                            c === cols - 1
                                ? <Skeleton key={c} w={64} h={20} r={99} />
                                : <Skeleton key={c} w={widths[(r + c) % widths.length]} h={12} />
                        ))}
                    </div>
                ))}
            </div>
        </SkeletonBlock>
    );
}

/** The parish's week of Masses: seven rows, the day on the left, dotted times across. */
export function WeekScheduleSkeleton() {
    return (
        <SkeletonBlock label="Loading Mass schedule…">
            <div className="skel-week">
                {[5, 2, 2, 2, 2, 2, 2].map((n, i) => (
                    <div key={i} className="skel-week__row">
                        <Skeleton w={i === 0 ? 78 : 96} h={14} />
                        <div className="skel-week__times">
                            {Array.from({ length: n }, (_, j) => <Skeleton key={j} w={j % 2 ? 128 : 66} h={13} />)}
                        </div>
                    </div>
                ))}
            </div>
        </SkeletonBlock>
    );
}

/**
 * A parish landing page before the parish is known: the bar, the hero with
 * its crest, and the row of service tiles — so the page is the right height
 * from the first paint and nothing jumps when the church arrives.
 */
export function ParishLandingSkeleton() {
    return (
        <SkeletonBlock label="Loading parish…" className="skel-lp">
            <div className="skel-lp__nav">
                <Skeleton w={30} h={30} r={8} />
                <Skeleton w={134} h={18} />
                <span className="skel-lp__spacer" />
                <Skeleton w={58} h={12} />
                <Skeleton w={92} h={12} />
                <Skeleton w={34} h={12} />
            </div>

            <div className="skel-lp__hero">
                <div className="skel-lp__copy">
                    <Skeleton w={130} h={10} style={{ marginBottom: 8 }} />
                    <Skeleton w="88%" h={44} r={8} />
                    <Skeleton w="62%" h={44} r={8} />
                    <Skeleton w="92%" h={13} style={{ marginTop: 18 }} />
                    <Skeleton w="76%" h={13} />
                    <div className="skel-lp__cta">
                        <Skeleton w={168} h={54} r={99} />
                    </div>
                </div>
                <Skeleton w="100%" h={364} r={22} className="skel-lp__crest" />
            </div>

            <div className="skel-lp__tiles">
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="skel-lp__tile">
                        <Skeleton w={40} h={40} r={12} />
                        <Skeleton w="64%" h={14} style={{ marginTop: 14 }} />
                        <Skeleton w="92%" h={11} />
                        <Skeleton w="80%" h={11} />
                    </div>
                ))}
            </div>
        </SkeletonBlock>
    );
}

/** Generic rows, for admin tables that have no distinctive shape. */
export function RowsSkeleton({ rows = 5, label = 'Loading…' }) {
    return (
        <SkeletonBlock label={label}>
            <div className="skel-rows">
                {Array.from({ length: rows }, (_, i) => (
                    <div key={i} className="skel-row">
                        <div className="skel-row__main">
                            <Skeleton w="30%" h={13} />
                            <Skeleton w="48%" h={11} />
                        </div>
                        <Skeleton w={64} h={20} r={99} />
                    </div>
                ))}
            </div>
        </SkeletonBlock>
    );
}

/** A line chart and its legend: the plot's frame with rising bars in it, then summary cards. */
export function ChartSkeleton({ cards = 5 }) {
    const heights = [30, 45, 38, 60, 52, 75, 64, 88, 70, 58, 80, 66];
    return (
        <SkeletonBlock label="Loading analytics…">
            <div className="skel-chart">
                {heights.map((h, i) => <Skeleton key={i} w="100%" h={`${h}%`} r={3} style={{ alignSelf: 'flex-end' }} />)}
            </div>
            <div className="skel-chart__legend">
                {Array.from({ length: cards }, (_, i) => <Skeleton key={i} w={96} h={12} />)}
            </div>
            <div className="skel-chart__cards">
                {Array.from({ length: cards }, (_, i) => (
                    <div key={i} className="skel-chart__card">
                        <Skeleton w="55%" h={12} />
                        <Skeleton w="80%" h={10} />
                        <Skeleton w="65%" h={10} />
                        <Skeleton w="72%" h={10} />
                    </div>
                ))}
            </div>
        </SkeletonBlock>
    );
}
