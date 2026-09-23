import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faChurch, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { mediaUrl } from '../utils/media';
import ParishMark from './ParishMark';

const EVERY = 4500;

/**
 * The parishes on SacraSched, one after another, in the hero of the main
 * landing page — each with the photo it published, its name and where it
 * is; a click opens its site. Moves on by itself, waits while the pointer
 * is over it, and can be stepped by hand.
 */
export default function ParishCarousel({ sites = [] }) {
    const [i, setI]         = useState(0);
    const [paused, setPause] = useState(false);
    const n = sites.length;

    useEffect(() => {
        if (n < 2 || paused) return;
        const t = setInterval(() => setI(k => (k + 1) % n), EVERY);
        return () => clearInterval(t);
    }, [n, paused]);

    if (!n) return null;
    const at = Math.min(i, n - 1);
    const go = d => setI((at + d + n) % n);

    return (
        <div className="lp-carousel" onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}
             aria-roledescription="carousel" aria-label="Parishes on SacraSched">
            <div className="lp-carousel__track" style={{ transform: `translateX(-${at * 100}%)` }}>
                {sites.map((s, k) => {
                    const inner = (
                        <>
                            {s.photo
                                ? <img className="lp-carousel__img" src={mediaUrl(s.photo)} alt="" loading={k ? 'lazy' : 'eager'} />
                                : <div className="lp-carousel__img lp-carousel__img--empty"><FontAwesomeIcon icon={faChurch} /></div>}
                            <span className="lp-carousel__shade" aria-hidden="true" />
                            <span className="lp-carousel__text">
                                <ParishMark parish={s} className="lp-carousel__badge" />
                                <span className="lp-carousel__name">
                                    <b>{s.name}</b>
                                    {(s.diocese || s.address) && <span>{[s.diocese, s.address].filter(Boolean).join(' · ')}</span>}
                                </span>
                                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="lp-carousel__go" />
                            </span>
                        </>
                    );
                    const cls = 'lp-carousel__slide' + (k === at ? ' lp-carousel__slide--on' : '');
                    return <a key={s._id} href={s.url} target="_blank" rel="noreferrer" className={cls} aria-hidden={k !== at} tabIndex={k === at ? 0 : -1}>{inner}</a>;
                })}
            </div>

            {n > 1 && (
                <>
                    <button type="button" className="lp-carousel__arrow lp-carousel__arrow--prev" onClick={() => go(-1)} aria-label="Previous parish">
                        <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    <button type="button" className="lp-carousel__arrow lp-carousel__arrow--next" onClick={() => go(1)} aria-label="Next parish">
                        <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                    <div className="lp-carousel__dots">
                        {sites.map((s, k) => (
                            <button key={s._id} type="button" className={`lp-carousel__dot${k === at ? ' lp-carousel__dot--on' : ''}`}
                                    onClick={() => setI(k)} aria-label={`Show ${s.name}`} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
