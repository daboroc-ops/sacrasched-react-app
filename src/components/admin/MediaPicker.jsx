import { useEffect, useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Modal, Loading, Empty, ErrorText, Pagination } from './AdminUI';
import { mediaUrl } from '../../utils/media';

/**
 * Pick a picture out of the parish's media library (Admin → Content).
 * Used by the post editor for pictures in the text and for the cover.
 */
export default function MediaPicker({ onPick, onClose, title = 'Choose a picture', multi = false, picked = [] }) {
    const axios = useAxiosPrivate();
    const [data,    setData]    = useState({ items: [], page: 1, totalPages: 1, total: 0 });
    const [page,    setPage]    = useState(1);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const res = await axios.get('/admin-api/media', { params: { page, limit: 24 } });
                if (alive) { setData(res.data); setError(''); }
            } catch {
                if (alive) setError('Could not load the library.');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [axios, page]);

    return (
        <Modal title={title} onClose={onClose} wide>
            {loading ? <Loading label="Loading the library…" rows={3} />
             : error ? <ErrorText>{error}</ErrorText>
             : data.items.length === 0 ? <Empty>No pictures yet — upload some under Content first.</Empty>
             : (
                <>
                    <div className="mp__grid">
                        {data.items.map(a => (
                            <button key={a._id} type="button" className={`mp__item${picked.includes(a.url) ? ' mp__item--on' : ''}`}
                                    onClick={() => onPick(a)} title={a.originalName}>
                                <img src={mediaUrl(a.url)} alt={a.alt || ''} loading="lazy" />
                                <span>{a.alt || a.originalName}</span>
                            </button>
                        ))}
                    </div>
                    <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
                    {multi && (
                        <div className="ad-form__actions">
                            <button type="button" className="ad-btn ad-btn--filled" onClick={onClose}>Done</button>
                        </div>
                    )}
                </>
            )}
        </Modal>
    );
}
