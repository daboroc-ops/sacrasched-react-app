import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUpload, faTrash, faRotate, faImage, faCheck, faPen, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import {
    Pagination, Modal, ConfirmDialog, Banner, Loading, ErrorText, Empty,
} from '../../components/admin/AdminUI';
import { fmtDate } from '../../utils/format';
import { mediaUrl, fileSize } from '../../utils/media';

const EMPTY = { items: [], page: 1, totalPages: 1, total: 0, slots: [] };

/**
 * The CMS: upload images once, then publish one to each content slot.
 * "Login cover" is the photo on the sign-in page.
 */
export default function AdminContent() {
    const axios = useAxiosPrivate();
    const { isAdmin } = useAuth();

    const [data,    setData]    = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [page,    setPage]    = useState(1);
    const [nonce,   setNonce]   = useState(0);

    const [uploading, setUploading] = useState(false);
    const [dragging,  setDragging]  = useState(false);
    const [busyId,    setBusyId]    = useState(null);
    const [notice,    setNotice]    = useState(null);
    const [editing,   setEditing]   = useState(null);   // asset whose alt text is open
    const [toDelete,  setToDelete]  = useState(null);
    const [uploadFor, setUploadFor] = useState(null);   // slot key an upload should publish to

    const fileInput = useRef(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/admin-api/media', { params: { page } });
                if (!alive) return;
                setData(res.data);
                setError('');
            } catch (err) {
                if (!alive) return;
                setError(
                    err?.response?.status === 403
                        ? 'You do not have permission to manage content.'
                        : err?.response?.data?.message || 'Failed to load the media library.'
                );
                setData(EMPTY);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [axios, page, nonce]);

    const reload = () => { setLoading(true); setNonce(n => n + 1); };

    const upload = async (file, slot) => {
        if (!file) return;
        setUploading(true);
        setNotice(null);

        const body = new FormData();
        body.append('image', file);
        if (slot) body.append('slot', slot);

        try {
            await axios.post('/admin-api/media', body, {
                headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000
            });
            setNotice({
                tone: 'ok',
                message: slot ? 'Image uploaded and published.' : 'Image uploaded to the library.'
            });
            setUploadFor(null);
            reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Upload failed.' });
        } finally {
            setUploading(false);
            if (fileInput.current) fileInput.current.value = '';
        }
    };

    const publish = async (asset, slot) => {
        setBusyId(asset._id);
        setNotice(null);
        try {
            await axios.patch(`/admin-api/media/${asset._id}`, { slot });
            setNotice({ tone: 'ok', message: slot ? 'Published.' : 'Removed from that slot.' });
            reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to publish the image.' });
        } finally {
            setBusyId(null);
        }
    };

    const remove = async () => {
        setBusyId(toDelete._id);
        try {
            await axios.delete(`/admin-api/media/${toDelete._id}`);
            setToDelete(null);
            setNotice({ tone: 'ok', message: 'Image deleted.' });
            reload();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to delete the image.' });
        } finally {
            setBusyId(null);
        }
    };

    const onDrop = e => {
        e.preventDefault();
        setDragging(false);
        if (!isAdmin) return;
        upload(e.dataTransfer.files?.[0], uploadFor);
    };

    if (loading) return <Loading label="Loading content…" />;
    if (error)   return <ErrorText>{error}</ErrorText>;

    return (
        <>
            <Banner {...(notice || {})} onDismiss={() => setNotice(null)} />

            {/* ── Slots ── */}
            <div className="ad-section-hd">
                <h2>Where images appear</h2>
                <span>One image per slot</span>
            </div>

            <div className="ad-grid ad-grid--2">
                {data.slots.map(slot => (
                    <section className="ad-card cms-slot" key={slot.key}>
                        <header className="ad-card__head">
                            <h3>{slot.label}</h3>
                            {slot.asset
                                ? <span className="ad-badge ad-badge--ok">published</span>
                                : <span className="ad-badge ad-badge--muted">empty</span>}
                        </header>

                        <div className="cms-slot__frame">
                            {slot.asset ? (
                                <img src={mediaUrl(slot.asset.url)} alt={slot.asset.alt || ''} />
                            ) : (
                                <div className="cms-slot__empty">
                                    <FontAwesomeIcon icon={faImage} />
                                    <span>No image yet</span>
                                </div>
                            )}
                        </div>

                        <p className="cms-slot__desc">
                            {slot.description} <em>{slot.recommended}</em>
                        </p>

                        {isAdmin && (
                            <div className="cms-slot__actions">
                                <button
                                    className="ad-btn ad-btn--filled ad-btn--sm"
                                    disabled={uploading}
                                    onClick={() => { setUploadFor(slot.key); fileInput.current?.click(); }}
                                >
                                    <FontAwesomeIcon icon={faUpload} />
                                    {slot.asset ? ' Replace' : ' Upload image'}
                                </button>

                                {slot.asset && (
                                    <button
                                        className="ad-btn ad-btn--ghost ad-btn--sm"
                                        disabled={busyId === slot.asset._id}
                                        onClick={() => publish(slot.asset, '')}
                                    >
                                        <FontAwesomeIcon icon={faXmark} /> Unpublish
                                    </button>
                                )}
                            </div>
                        )}
                    </section>
                ))}
            </div>

            {/* ── Library ── */}
            <div className="ad-section-hd">
                <h2>Media library</h2>
                <span>{data.total} image{data.total === 1 ? '' : 's'}</span>
            </div>

            {isAdmin && (
                <div
                    className={`cms-drop ${dragging ? 'cms-drop--over' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                >
                    <FontAwesomeIcon icon={faUpload} className="cms-drop__icon" />
                    <p>
                        <button
                            className="cms-drop__link"
                            onClick={() => { setUploadFor(null); fileInput.current?.click(); }}
                            disabled={uploading}
                        >
                            {uploading ? 'Uploading…' : 'Choose an image'}
                        </button>
                        {' '}or drag one here
                    </p>
                    <span>JPG, PNG, WebP, GIF or AVIF · up to 5 MB</span>

                    <input
                        ref={fileInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        hidden
                        onChange={e => upload(e.target.files?.[0], uploadFor)}
                    />
                </div>
            )}

            <div className="ad-toolbar">
                <span className="ad-pagination__meta">Newest first</span>
                <button className="ad-btn ad-btn--ghost" onClick={reload} title="Refresh">
                    <FontAwesomeIcon icon={faRotate} />
                </button>
            </div>

            {data.items.length === 0 ? <Empty>No images uploaded yet.</Empty> : (
                <div className="cms-grid">
                    {data.items.map(asset => (
                        <figure className={`cms-item ${busyId === asset._id ? 'ad-row--busy' : ''}`} key={asset._id}>
                            <div className="cms-item__thumb">
                                <img src={mediaUrl(asset.url)} alt={asset.alt || ''} loading="lazy" />
                                {asset.slot && (
                                    <span className="cms-item__flag">
                                        <FontAwesomeIcon icon={faCheck} />
                                        {data.slots.find(s => s.key === asset.slot)?.label || asset.slot}
                                    </span>
                                )}
                            </div>

                            <figcaption className="cms-item__meta">
                                <b title={asset.originalName}>{asset.originalName || asset.filename}</b>
                                <span>{fileSize(asset.size)} · {fmtDate(asset.createdAt)}</span>
                                <span className="cms-item__alt">
                                    {asset.alt ? asset.alt : <em>No description</em>}
                                </span>
                            </figcaption>

                            {isAdmin && (
                                <div className="cms-item__actions">
                                    <select
                                        className="ad-select ad-select--sm"
                                        value={asset.slot || ''}
                                        disabled={busyId === asset._id}
                                        onChange={e => publish(asset, e.target.value)}
                                    >
                                        <option value="">Not published</option>
                                        {data.slots.map(s => (
                                            <option key={s.key} value={s.key}>{s.label}</option>
                                        ))}
                                    </select>

                                    <button
                                        className="ad-icon-btn"
                                        title="Edit description"
                                        onClick={() => setEditing(asset)}
                                    >
                                        <FontAwesomeIcon icon={faPen} />
                                    </button>
                                    <button
                                        className="ad-icon-btn ad-icon-btn--danger"
                                        title="Delete"
                                        onClick={() => setToDelete(asset)}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>
                            )}
                        </figure>
                    ))}
                </div>
            )}

            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={p => { setLoading(true); setPage(p); }} />

            {editing && (
                <AltTextDialog
                    asset={editing}
                    onClose={() => setEditing(null)}
                    onSaved={message => { setEditing(null); setNotice({ tone: 'ok', message }); reload(); }}
                />
            )}

            {toDelete && (
                <ConfirmDialog
                    title="Delete this image?"
                    message={toDelete.slot
                        ? 'It is currently published to a slot — that slot will fall back to the built-in placeholder.'
                        : 'The file is removed from the server permanently.'}
                    busy={busyId === toDelete._id}
                    onCancel={() => setToDelete(null)}
                    onConfirm={remove}
                />
            )}
        </>
    );
}

/* ── Alt text ────────────────────────────────────────────────── */

function AltTextDialog({ asset, onClose, onSaved }) {
    const axios = useAxiosPrivate();
    const [alt,    setAlt]    = useState(asset.alt || '');
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');

    const submit = async e => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await axios.patch(`/admin-api/media/${asset._id}`, { alt });
            onSaved('Description saved.');
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to save the description.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Image description" onClose={onClose}>
            <form className="ad-form" onSubmit={submit}>
                {error && <Banner tone="bad" message={error} />}

                <img src={mediaUrl(asset.url)} alt={asset.alt || ''} className="cms-dialog__preview" />

                <label className="ad-field">
                    <span className="ad-field__label">Description (alt text)</span>
                    <input
                        className="ad-input"
                        value={alt}
                        placeholder="e.g. Parish façade at golden hour"
                        onChange={e => setAlt(e.target.value)}
                    />
                </label>
                <p className="sa-hint">Read aloud by screen readers and shown if the image fails to load.</p>

                <div className="ad-form__actions">
                    <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="submit" className="ad-btn ad-btn--filled" disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
