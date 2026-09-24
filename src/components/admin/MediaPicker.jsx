import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload } from '@fortawesome/free-solid-svg-icons';
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

    /* Uploading from here as well as choosing: a post is usually written
       about something that has just happened, and its pictures are on the
       writer's machine, not in the library yet. */
    const fileInput = useRef(null);
    const [uploading, setUploading] = useState(false);

    const upload = async file => {
        if (!file) return;
        setUploading(true);
        setError('');
        try {
            const body = new FormData();
            body.append('image', file);
            const res = await axios.post('/admin-api/media', body, {
                headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000
            });
            // Straight into the post — uploading it was the whole intent
            onPick(res.data);
        } catch (err) {
            setError(err?.response?.data?.message || 'That picture could not be uploaded.');
        } finally {
            setUploading(false);
            if (fileInput.current) fileInput.current.value = '';
        }
    };

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
            <div className="mp__upload">
                <button type="button" className="ad-btn ad-btn--filled ad-btn--sm"
                        disabled={uploading} onClick={() => fileInput.current?.click()}>
                    <FontAwesomeIcon icon={faUpload} />
                    {uploading ? ' Uploading…' : ' Upload a picture'}
                </button>
                <span className="mp__upload-hint">or choose one already in the library</span>
                <input ref={fileInput} type="file" accept="image/*" hidden
                       onChange={e => upload(e.target.files?.[0])} />
            </div>

            {error && <ErrorText>{error}</ErrorText>}

            {loading ? <Loading label="Loading the library…" rows={3} />
             : error ? null
             : data.items.length === 0 ? <Empty>Nothing in the library yet — upload a picture above.</Empty>
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
