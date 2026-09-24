import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faChurch, faThumbtack } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import useParish, { usePageTitle } from '../hooks/useParish';
import { mediaUrl } from '../utils/media';
import { fmtPostDate, postHtmlForPage, newsPath, postPath } from '../utils/posts';
import { Skeleton, SkeletonBlock } from '../components/Skeleton';
import ParishMark from '../components/ParishMark';

/**
 * One post, on its own page — /news/<slug> on a parish's site, or
 * /parish/<subdomain>/news/<slug> on the platform.
 *
 * The body is the HTML the office wrote in the editor, already reduced by
 * the API to the handful of tags a post may carry, so it is rendered as is.
 */
export default function ParishPost() {
    const { subdomain = '', slug } = useParams();
    const { parish: tenant } = useParish();

    const [post,   setPost]   = useState(null);
    const [parish, setParish] = useState(tenant || null);
    const [state,  setState]  = useState('loading');   // 'loading' | 'ok' | 'missing'

    usePageTitle(post?.title || null);
    useEffect(() => { window.scrollTo(0, 0); }, [slug]);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [p, site] = await Promise.all([
                    axiosPublic.get(`/site/posts/${encodeURIComponent(slug)}`, { params: subdomain ? { subdomain } : {} }),
                    // On the platform the parish is named by the URL; on its own site it is already known
                    subdomain && !tenant ? axiosPublic.get('/site', { params: { subdomain } }) : Promise.resolve(null)
                ]);
                if (!alive) return;
                setPost(p.data);
                if (site) setParish(site.data);
                setState('ok');
            } catch {
                if (alive) setState('missing');
            }
        })();
        return () => { alive = false; };
    }, [slug, subdomain, tenant]);

    const home = subdomain ? `/parish/${subdomain}` : '/';
    const name = parish?.name || 'the parish';

    return (
        <div className="lp pl post-page">
            <header className="lp-nav pl-nav">
                <div className="lp-nav__inner">
                    <Link to={home} className="lp-nav__brand pl-nav__brand">
                        {parish ? <ParishMark parish={parish} className="pl-nav__badge" /> : <span className="pl-nav__badge"><FontAwesomeIcon icon={faChurch} /></span>}
                        <span className="pl-nav__names"><b>{name}</b></span>
                    </Link>
                    <Link to={newsPath(subdomain)} className="lp-btn lp-btn--ghost lp-btn--sm post-page__back">
                        <FontAwesomeIcon icon={faArrowLeft} /> All news
                    </Link>
                </div>
            </header>

            <main className="post">
                {state === 'loading' && (
                    <SkeletonBlock label="Loading the post…">
                        <Skeleton w="40%" h={12} />
                        <Skeleton w="88%" h={34} r={8} style={{ marginTop: 14 }} />
                        <Skeleton w="64%" h={34} r={8} />
                        <Skeleton w="100%" h={280} r={16} style={{ marginTop: 22 }} />
                        <Skeleton w="100%" h={13} style={{ marginTop: 22 }} />
                        <Skeleton w="96%" h={13} />
                        <Skeleton w="72%" h={13} />
                    </SkeletonBlock>
                )}

                {state === 'missing' && (
                    <div className="lp-directory__empty">
                        <FontAwesomeIcon icon={faChurch} />
                        <p><b>That post isn’t here.</b></p>
                        <p>It may have been taken down, or the address is wrong.</p>
                        <Link to={home} className="lp-btn lp-btn--filled pl-state__back">
                            <FontAwesomeIcon icon={faArrowLeft} /> Back to {name}
                        </Link>
                    </div>
                )}

                {state === 'ok' && post && (
                    <article>
                        <p className="post__meta">
                            {post.pinned && <em className="pp__pin"><FontAwesomeIcon icon={faThumbtack} /> Pinned</em>}
                            <time dateTime={post.publishedAt}>{fmtPostDate(post.publishedAt)}</time>
                        </p>
                        <h1 className="post__title">{post.title}</h1>
                        {post.coverUrl && (
                            <figure className="post__cover">
                                <img src={mediaUrl(post.coverUrl)} alt={post.coverAlt || ''} />
                            </figure>
                        )}
                        {/* Server-sanitised HTML from the office's editor */}
                        <div className="post__body" dangerouslySetInnerHTML={{ __html: postHtmlForPage(post.body) }} />
                        {post.gallery?.length > 0 && (
                            <div className="post__gallery">
                                {post.gallery.map((g, i) => (
                                    <figure key={i}>
                                        <img src={mediaUrl(g.url)} alt={g.alt || ''} loading="lazy" />
                                        {g.alt && <figcaption>{g.alt}</figcaption>}
                                    </figure>
                                ))}
                            </div>
                        )}

                        {/* Straight on to the notice either side, without going
                            back to the list for it. Each side is left out when
                            there is nothing there — the oldest post has no
                            previous — and the other keeps its own end of the
                            row, so the remaining link does not drift inwards. */}
                        {(post.prev || post.next) && (
                            <nav className="post-nav" aria-label="More posts">
                                {post.prev ? (
                                    <Link
                                        to={postPath(subdomain, post.prev.slug)}
                                        className="post-nav__link post-nav__link--prev"
                                        title={post.prev.title}
                                    >
                                        <span aria-hidden="true">&larr;</span> Previous Post
                                    </Link>
                                ) : <span />}

                                {post.next ? (
                                    <Link
                                        to={postPath(subdomain, post.next.slug)}
                                        className="post-nav__link post-nav__link--next"
                                        title={post.next.title}
                                    >
                                        Next Post <span aria-hidden="true">&rarr;</span>
                                    </Link>
                                ) : <span />}
                            </nav>
                        )}
                    </article>
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
