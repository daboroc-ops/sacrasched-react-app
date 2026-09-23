import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faThumbtack, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import axiosPublic from '../api/axios';
import { mediaUrl } from '../utils/media';
import { PostsSkeleton } from './Skeleton';
import { postPath, fmtPostDate as fmtDate } from '../utils/posts';

/**
 * The parish's news and announcements on its landing page — whatever the
 * office has published from Admin → Posts, newest first, pinned on top.
 * The section is absent until there is something to read.
 */
export default function ParishPosts({ subdomain = '' }) {
    const [posts, setPosts] = useState(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axiosPublic.get('/site/posts', { params: { limit: 6, ...(subdomain && { subdomain }) } });
                if (alive) setPosts(res.data?.items || []);
            } catch {
                if (alive) setPosts([]);
            }
        })();
        return () => { alive = false; };
    }, [subdomain]);

    if (posts && posts.length === 0) return null;

    return (
        <section className="lp-section" id="news">
            <div className="lp-section__inner">
                <div className="lp-section__hd">
                    <h2>News &amp; announcements</h2>
                </div>

                {!posts ? <PostsSkeleton /> : (

                <div className="pp">
                    {posts.map(p => (
                        <Link key={p.slug} to={postPath(subdomain, p.slug)} className={`pp__card${p.coverUrl ? '' : ' pp__card--bare'}`}>
                            {p.coverUrl && (
                                <span className="pp__cover">
                                    <img src={mediaUrl(p.coverUrl)} alt={p.coverAlt || ''} loading="lazy" />
                                </span>
                            )}
                            <span className="pp__body">
                                <span className="pp__meta">
                                    {p.pinned && <em className="pp__pin"><FontAwesomeIcon icon={faThumbtack} /> Pinned</em>}
                                    <time dateTime={p.publishedAt}>{fmtDate(p.publishedAt)}</time>
                                </span>
                                <span className="pp__title">{p.title}</span>
                                {p.excerpt && <span className="pp__excerpt">{p.excerpt}</span>}
                                <span className="pp__more">Read more <FontAwesomeIcon icon={faArrowRight} /></span>
                            </span>
                        </Link>
                    ))}
                </div>
                )}
            </div>
        </section>
    );
}
