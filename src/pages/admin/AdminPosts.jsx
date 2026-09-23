import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus, faPen, faTrash, faThumbtack, faEye, faEyeSlash, faImage, faXmark, faArrowLeft, faRotate,
} from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import {
    FilterBar, Pagination, ConfirmDialog, Banner, Loading, ErrorText, Empty, StatusBadge,
} from '../../components/admin/AdminUI';
import RichEditor from '../../components/admin/RichEditor';
import MediaPicker from '../../components/admin/MediaPicker';
import { fmtDate } from '../../utils/format';
import { mediaUrl } from '../../utils/media';

const EMPTY = { items: [], page: 1, totalPages: 1, total: 0, counts: {} };
const BLANK = { title: '', body: '', coverUrl: '', coverAlt: '', gallery: [], pinned: false, status: 'draft' };

/**
 * Posts — the parish's news and announcements, written here and shown on
 * its landing page the moment they are published.
 */
export default function AdminPosts() {
    const axios = useAxiosPrivate();
    const { isAdmin } = useAuth();

    const [data,    setData]    = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [status,  setStatus]  = useState('all');
    const [page,    setPage]    = useState(1);
    const [notice,  setNotice]  = useState(null);
    const [busyId,  setBusyId]  = useState(null);
    const [toDelete, setToDelete] = useState(null);

    // null = the list; {} = a new post; a post = editing it
    const [editing, setEditing] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await axios.get('/admin-api/posts', { params: { page, limit: 12, ...(status !== 'all' && { status }) } });
            setData(res.data); setError('');
        } catch {
            setError('Could not load the posts.');
        } finally {
            setLoading(false);
        }
    }, [axios, page, status]);

    // The fetch starts on the next tick, so the effect itself sets no state
    useEffect(() => { const t = setTimeout(() => { setLoading(true); load(); }, 0); return () => clearTimeout(t); }, [load]);

    const toggle = async (post, field) => {
        setBusyId(post._id);
        try {
            const patch = field === 'status'
                ? { status: post.status === 'published' ? 'draft' : 'published' }
                : { pinned: !post.pinned };
            await axios.patch(`/admin-api/posts/${post._id}`, patch);
            setNotice({ tone: 'ok', message: field === 'status'
                ? (post.status === 'published' ? 'Taken off the page — it is a draft again.' : 'Published — it is on the parish page now.')
                : (post.pinned ? 'Unpinned.' : 'Pinned to the top.') });
            load();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not update the post.' });
        } finally {
            setBusyId(null);
        }
    };

    const remove = async () => {
        const post = toDelete;
        setBusyId(post._id);
        try {
            await axios.delete(`/admin-api/posts/${post._id}`);
            setNotice({ tone: 'ok', message: 'Post deleted.' });
            setToDelete(null);
            load();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not delete the post.' });
        } finally {
            setBusyId(null);
        }
    };

    if (editing) return (
        <PostEditor
            post={editing}
            onCancel={() => setEditing(null)}
            onSaved={(post, what) => {
                setEditing(null);
                setNotice({ tone: 'ok', message: what });
                load();
            }}
        />
    );

    const total = Object.values(data.counts || {}).reduce((a, b) => a + b, 0);

    return (
        <>
            <div className="ad-toolbar">
                <FilterBar options={['all', 'published', 'draft']} value={status}
                           onChange={v => { setStatus(v); setPage(1); }} counts={data.counts} total={total} />
                <div className="ad-toolbar__actions">
                    <button className="ad-btn ad-btn--ghost" onClick={load} title="Refresh"><FontAwesomeIcon icon={faRotate} /></button>
                    <button className="ad-btn ad-btn--filled" onClick={() => setEditing({})}>
                        <FontAwesomeIcon icon={faPlus} /> New post
                    </button>
                </div>
            </div>

            <Banner {...(notice || {})} onDismiss={() => setNotice(null)} />

            {loading ? <Loading label="Loading posts…" />
             : error ? <ErrorText>{error}</ErrorText>
             : data.items.length === 0 ? <Empty>No posts yet. Write the first one — a fiesta announcement, a schedule change, a word from the parish priest.</Empty>
             : (
                <div className="ad-posts">
                    {data.items.map(p => (
                        <article key={p._id} className={`ad-post${p.status === 'published' ? '' : ' ad-post--draft'}`}>
                            <div className="ad-post__cover">
                                {p.coverUrl ? <img src={mediaUrl(p.coverUrl)} alt={p.coverAlt || ''} /> : <FontAwesomeIcon icon={faImage} />}
                            </div>
                            <div className="ad-post__body">
                                <div className="ad-post__meta">
                                    <StatusBadge status={p.status} />
                                    {p.pinned && <span className="ad-post__pin"><FontAwesomeIcon icon={faThumbtack} /> Pinned</span>}
                                    <span className="ad-muted">
                                        {p.status === 'published' && p.publishedAt ? `Published ${fmtDate(p.publishedAt)}` : `Edited ${fmtDate(p.updatedAt)}`}
                                    </span>
                                </div>
                                <h3 className="ad-post__title">{p.title}</h3>
                                <p className="ad-post__excerpt">{p.excerpt || <span className="ad-muted">No text yet.</span>}</p>
                            </div>
                            <div className="ad-post__actions">
                                <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setEditing(p)} disabled={busyId === p._id}>
                                    <FontAwesomeIcon icon={faPen} /> Edit
                                </button>
                                <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => toggle(p, 'status')} disabled={busyId === p._id}
                                        title={p.status === 'published' ? 'Take it off the page' : 'Put it on the page'}>
                                    <FontAwesomeIcon icon={p.status === 'published' ? faEyeSlash : faEye} /> {p.status === 'published' ? 'Unpublish' : 'Publish'}
                                </button>
                                <button className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => toggle(p, 'pinned')} disabled={busyId === p._id}>
                                    <FontAwesomeIcon icon={faThumbtack} /> {p.pinned ? 'Unpin' : 'Pin'}
                                </button>
                                {isAdmin && (
                                    <button className="ad-icon-btn ad-icon-btn--danger" onClick={() => setToDelete(p)} title="Delete" disabled={busyId === p._id}>
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                    <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
                </div>
            )}

            {toDelete && (
                <ConfirmDialog
                    title="Delete this post?"
                    message={`"${toDelete.title}" will be removed from the parish page and cannot be recovered.`}
                    onConfirm={remove}
                    onCancel={() => setToDelete(null)}
                    busy={busyId === toDelete._id}
                />
            )}
        </>
    );
}

/* ── Writing a post ─────────────────────────────────────────── */

function PostEditor({ post, onCancel, onSaved }) {
    const axios = useAxiosPrivate();
    const isNew = !post._id;

    const [form,    setForm]    = useState({ ...BLANK, ...post });
    const [saving,  setSaving]  = useState('');       // '' | 'draft' | 'published'
    const [error,   setError]   = useState('');
    const [picking, setPicking] = useState(false);       // the cover
    const [adding,  setAdding]  = useState(false);       // the gallery

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const addPicture = a => setForm(f => (f.gallery.some(g => g.url === a.url) ? f : { ...f, gallery: [...f.gallery, { url: a.url, alt: a.alt || '' }] }));
    const dropPicture = url => setForm(f => ({ ...f, gallery: f.gallery.filter(g => g.url !== url) }));

    const save = async status => {
        if (!form.title.trim()) return setError('Give the post a title.');
        setSaving(status); setError('');
        try {
            const payload = { title: form.title, body: form.body, coverUrl: form.coverUrl, coverAlt: form.coverAlt, gallery: form.gallery, pinned: form.pinned, status };
            const res = isNew
                ? await axios.post('/admin-api/posts', payload)
                : await axios.patch(`/admin-api/posts/${post._id}`, payload);
            onSaved(res.data, status === 'published'
                ? 'Published — it is on the parish page now.'
                : isNew ? 'Saved as a draft.' : 'Changes saved.');
        } catch (err) {
            setError(err?.response?.data?.message || 'Could not save the post.');
        } finally {
            setSaving('');
        }
    };

    return (
        <div className="ad-post-editor">
            <div className="ad-toolbar">
                <button type="button" className="ad-btn ad-btn--ghost" onClick={onCancel}>
                    <FontAwesomeIcon icon={faArrowLeft} /> All posts
                </button>
                <div className="ad-toolbar__actions">
                    <button type="button" className="ad-btn ad-btn--ghost" disabled={Boolean(saving)} onClick={() => save('draft')}>
                        {saving === 'draft' ? 'Saving…' : form.status === 'published' ? 'Save as draft' : 'Save draft'}
                    </button>
                    <button type="button" className="ad-btn ad-btn--filled" disabled={Boolean(saving)} onClick={() => save('published')}>
                        {saving === 'published' ? 'Publishing…' : form.status === 'published' ? 'Save & keep published' : 'Publish'}
                    </button>
                </div>
            </div>

            {error && <Banner tone="bad" message={error} onDismiss={() => setError('')} />}

            <div className="ad-post-editor__grid">
                <div className="ad-card ad-post-editor__main">
                    <input
                        className="ad-input ad-post-editor__title"
                        placeholder="Title"
                        value={form.title}
                        maxLength={160}
                        onChange={e => set('title', e.target.value)}
                    />
                    <RichEditor value={form.body} onChange={html => set('body', html)} />
                </div>

                <aside className="ad-card ad-post-editor__side">
                    <h3>Cover picture</h3>
                    {form.coverUrl ? (
                        <div className="ad-post-editor__cover">
                            <img src={mediaUrl(form.coverUrl)} alt={form.coverAlt || ''} />
                            <button type="button" className="ad-icon-btn" onClick={() => { set('coverUrl', ''); set('coverAlt', ''); }} title="Remove">
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>
                    ) : (
                        <button type="button" className="ad-post-editor__pick" onClick={() => setPicking(true)}>
                            <FontAwesomeIcon icon={faImage} /> Choose from the library
                        </button>
                    )}
                    <small className="ad-muted">Shown on the card and above the post. Optional.</small>

                    <h3>More pictures</h3>
                    {form.gallery.length > 0 && (
                        <div className="ad-post-editor__gallery">
                            {form.gallery.map(g => (
                                <div key={g.url} className="ad-post-editor__thumb">
                                    <img src={mediaUrl(g.url)} alt={g.alt} />
                                    <button type="button" className="ad-icon-btn" onClick={() => dropPicture(g.url)} title="Remove">
                                        <FontAwesomeIcon icon={faXmark} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setAdding(true)}>
                        <FontAwesomeIcon icon={faImage} /> Add pictures
                    </button>
                    <small className="ad-muted">Shown under the post, as a gallery.</small>

                    <h3>Options</h3>
                    <label className="ad-check">
                        <input type="checkbox" checked={form.pinned} onChange={e => set('pinned', e.target.checked)} />
                        Pin to the top of the page
                    </label>
                    {!isNew && (
                        <p className="ad-muted">
                            {post.status === 'published' ? `Published ${fmtDate(post.publishedAt)}` : 'Draft'} · /news/{post.slug}
                        </p>
                    )}
                </aside>
            </div>

            {adding && (
                <MediaPicker title="Add pictures to the post" multi picked={form.gallery.map(g => g.url)}
                             onPick={addPicture} onClose={() => setAdding(false)} />
            )}
            {picking && (
                <MediaPicker title="Choose a cover picture"
                             onPick={a => { set('coverUrl', a.url); set('coverAlt', a.alt || ''); setPicking(false); }}
                             onClose={() => setPicking(false)} />
            )}
        </div>
    );
}
