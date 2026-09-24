import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faChurch, faThumbtack, faNewspaper } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import useParish, { usePageTitle } from '../hooks/useParish';
import { mediaUrl } from '../utils/media';
import { postPath, fmtPostDate } from '../utils/posts';
import { Skeleton, SkeletonBlock } from '../components/Skeleton';
import ParishMark from '../components/ParishMark';

const PER_PAGE = 12;

/**
 * Everything the parish has published — /news on its own site, or
 * /parish/<subdomain>/news on the platform.
 *
 * The landing page shows the three newest as cards; this is the whole lot,
 * as a list. A list rather than more cards on purpose: someone who came
 * here is looking for a particular notice, probably an older one, and a
 * column of dated titles is read down far faster than a grid of pictures.
 *
 * No account is needed. A parish's announcements are public reading.
 */
export default function ParishNews() {
    const { subdomain = '' } = useParams();
    const { parish: tenant } = useParish();

    const [posts,  setPosts]  = useState([]);
    const [total,  setTotal]  = useState(0);
    const [page,   setPage]   = useState(1);
    const [parish, setParish] = useState(tenant || null);
    const [state,  setState]  = useState('loading');   // 'loading' | 'ok' | 'missing'
    const [more,   setMore]   = useState(false);       // fetching the next page

    usePageTitle('News and announcements');
    useEffect(() => { window.scrollTo(0, 0); }, []);

    const params = useCallback(p => ({ limit: PER_PAGE, page: p, ...(subdomain && { subdomain }) }), [subdomain]);

    // First page, and the parish itself when the URL named it
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [res, site] = await Promise.all([
                    axiosPublic.get('/site/posts', { params: params(1) }),
                    subdomain && !tenant ? axiosPublic.get('/site', { params: { subdomain } }) : Promise.resolve(null)
                ]);
                if (!alive) return;
                setPosts(res.data?.items || []);
                setTotal(res.data?.total || 0);
                if (site) setParish(site.data);
                setState('ok');
            } catch {
                if (alive) setState('missing');
            }
        })();
        return () => { alive = false; };
    }, [subdomain, tenant, params]);

    /* Older posts are appended rather than replacing the page, so nobody
       loses their place in a list they were already reading down. */
    const loadMore = async () => {
        const next = page + 1;
        setMore(true);
        try {
            const res = await axiosPublic.get('/site/posts', { params: params(next) });
            setPosts(prev => [...prev, ...(res.data?.items || [])]);
            setPage(next);
        } catch {
            /* leave what is already listed; the button stays for another try */
        } finally {
            setMore(false);
        }
    };

    const home = subdomain ? `/parish/${subdomain}` : '/';
    const name = parish?.name || 'the parish';

    return (
        <div className="lp pl post-page">
            <header className="lp-nav pl-nav">
                <div className="lp-nav__inner">
                    <Link to={home} className="lp-nav__brand pl-nav__brand">
                        {parish
                            ? <ParishMark parish={parish} className="pl-nav__badge" />
                            : <span className="pl-nav__badge"><FontAwesomeIcon icon={faChurch} /></span>}
                        <span className="pl-nav__names"><b>{name}</b></span>
                    </Link>
                    <Link to={home} className="lp-btn lp-btn--ghost lp-btn--sm post-page__back">
                        <FontAwesomeIcon icon={faArrowLeft} /> Back to the parish
                    </Link>
                </div>
            </header>

            <main className="post news-index">
                <h1 className="post__title news-index__title">News and announcements</h1>
                <p className="news-index__sub">
                    {state === 'ok' && total > 0
                        ? `${total} ${total === 1 ? 'post' : 'posts'} from ${name}.`
                        : `Everything ${name} has published.`}
                </p>

                {state === 'loading' && (
                    <SkeletonBlock label="Loading the news…">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{ display: 'flex', gap: 14, marginTop: 18 }}>
                                <Skeleton w={104} h={78} r={10} />
                                <div style={{ flex: 1 }}>
                                    <Skeleton w="30%" h={11} />
                                    <Skeleton w="76%" h={18} r={6} style={{ marginTop: 10 }} />
                                    <Skeleton w="92%" h={12} style={{ marginTop: 10 }} />
                                </div>
                            </div>
                        ))}
                    </SkeletonBlock>
                )}

                {state === 'missing' && (
                    <div className="lp-directory__empty">
                        <FontAwesomeIcon icon={faChurch} />
                        <p><b>These aren’t here.</b></p>
                        <p>The address may be wrong, or this parish has no site yet.</p>
                        <Link to={home} className="lp-btn lp-btn--filled pl-state__back">
                            <FontAwesomeIcon icon={faArrowLeft} /> Back to {name}
                        </Link>
                    </div>
                )}

                {state === 'ok' && posts.length === 0 && (
                    <div className="lp-directory__empty">
                        <FontAwesomeIcon icon={faNewspaper} />
                        <p><b>Nothing published yet.</b></p>
                        <p>When the parish office posts a notice, it will appear here.</p>
                    </div>
                )}

                {state === 'ok' && posts.length > 0 && (
                    <>
                        <ol className="news-list">
                            {posts.map(p => (
                                <li key={p.slug} className="news-list__row">
                                    <Link to={postPath(subdomain, p.slug)} className="news-list__link">
                                        {p.coverUrl && (
                                            <span className="news-list__thumb">
                                                <img src={mediaUrl(p.coverUrl)} alt={p.coverAlt || ''} loading="lazy" />
                                            </span>
                                        )}
                                        <span className="news-list__text">
                                            <span className="news-list__meta">
                                                {p.pinned && <em className="pp__pin"><FontAwesomeIcon icon={faThumbtack} /> Pinned</em>}
                                                <time dateTime={p.publishedAt}>{fmtPostDate(p.publishedAt)}</time>
                                            </span>
                                            <span className="news-list__title">{p.title}</span>
                                            {p.excerpt && <span className="news-list__excerpt">{p.excerpt}</span>}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ol>

                        {posts.length < total && (
                            <div className="news-index__more">
                                <button
                                    type="button"
                                    className="lp-btn lp-btn--outline"
                                    onClick={loadMore}
                                    disabled={more}
                                >
                                    {more ? 'Loading…' : `Show older posts (${total - posts.length} more)`}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            <footer className="lp-footer">
                <div className="lp-footer__inner">
                    <span className="pl-footer__parish"><FontAwesomeIcon icon={faChurch} /> {name}</span>
                    <p className="lp-footer__note">© {new Date().getFullYear()} {name} · A parish site on SacraSched.</p>
                </div>
            </footer>
        </div>
    );
}
