import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faHeadset, faCircleXmark, faRobot } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { Banner, Loading, Empty, FilterBar } from '../../components/admin/AdminUI';
import { fmtStamp, relativeTime } from '../../utils/format';

/* How often the inbox and the open thread look for something new */
const LIST_POLL_MS   = 5000;
const THREAD_POLL_MS = 4000;

const STATUS_LABEL = { waiting: 'Waiting', active: 'Answered', closed: 'Closed' };

/**
 * Live Agent — parishioners the Messenger booking bot handed over to the
 * parish office, because they asked for a person or the bot could not
 * make out what they wanted. Staff read the conversation and reply here;
 * the reply reaches the parishioner in Messenger, from the parish's Page.
 */
export default function LiveAgent() {
    const axios = useAxiosPrivate();

    const [filter,  setFilter]  = useState('open');
    const [chats,   setChats]   = useState([]);
    const [counts,  setCounts]  = useState({ waiting: 0, active: 0 });
    const [loading, setLoading] = useState(true);
    const [openId,  setOpenId]  = useState(null);
    const [thread,  setThread]  = useState(null);
    const [draft,   setDraft]   = useState('');
    const [busy,    setBusy]    = useState(false);
    const [notice,  setNotice]  = useState(null);
    const bottom = useRef(null);

    const loadList = useCallback(async () => {
        try {
            const res = await axios.get('/admin-api/live-chats', { params: { status: filter } });
            setChats(res.data.items || []);
            setCounts(res.data.counts || { waiting: 0, active: 0 });
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not load the chats.' });
        } finally {
            setLoading(false);
        }
    }, [axios, filter]);

    useEffect(() => {
        const first = setTimeout(loadList, 0);
        const timer = setInterval(loadList, LIST_POLL_MS);
        return () => { clearTimeout(first); clearInterval(timer); };
    }, [loadList]);

    const loadThread = useCallback(async id => {
        try {
            const res = await axios.get(`/admin-api/live-chats/${id}`);
            setThread(t => (t && t._id === res.data._id && t.messages.length === res.data.messages.length && t.status === res.data.status ? t : res.data));
        } catch {
            /* the list shows the problem; keep what is on screen */
        }
    }, [axios]);

    useEffect(() => {
        if (!openId) return undefined;
        const first = setTimeout(() => loadThread(openId), 0);
        const timer = setInterval(() => loadThread(openId), THREAD_POLL_MS);
        return () => { clearTimeout(first); clearInterval(timer); };
    }, [openId, loadThread]);

    // Keep the newest message in view
    useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [thread?.messages?.length]);

    const open = id => { setThread(null); setDraft(''); setNotice(null); setOpenId(id); };

    const send = async e => {
        e.preventDefault();
        const text = draft.trim();
        if (!text || !thread) return;
        setBusy(true); setNotice(null);
        try {
            const res = await axios.post(`/admin-api/live-chats/${thread._id}/messages`, { text });
            setThread(res.data);
            setDraft('');
            loadList();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'The reply was not sent.' });
        } finally {
            setBusy(false);
        }
    };

    const close = async () => {
        if (!thread) return;
        setBusy(true); setNotice(null);
        try {
            const res = await axios.post(`/admin-api/live-chats/${thread._id}/close`);
            setThread(res.data);
            setNotice({ tone: 'ok', message: 'Chat ended — the parishioner is back with the booking assistant.' });
            loadList();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Could not end the chat.' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <p className="ad-card__meta la-intro">
                Parishioners the Messenger booking assistant could not help — they asked for a person, or it could
                not understand them. Replies are sent from the parish&rsquo;s Facebook Page, within 24 hours of their
                last message.
            </p>

            <Banner {...(notice || {})} onDismiss={() => setNotice(null)} />

            <div className="la">
                {/* ── Inbox ── */}
                <section className="ad-card la-list">
                    <div className="la-list__head">
                        <FilterBar
                            options={['open', 'closed']}
                            value={filter}
                            onChange={v => { setLoading(true); setFilter(v); }}
                            counts={{ open: counts.waiting + counts.active }}
                        />
                        {counts.waiting > 0 && <span className="la-waiting">{counts.waiting} waiting</span>}
                    </div>

                    {loading ? <Loading label="Loading chats…" /> : chats.length === 0 ? (
                        <Empty>{filter === 'open' ? 'Nobody is waiting for the office right now.' : 'No closed chats yet.'}</Empty>
                    ) : (
                        <ul className="la-chats">
                            {chats.map(c => (
                                <li key={c._id}>
                                    <button
                                        type="button"
                                        className={`la-chat${openId === c._id ? ' la-chat--on' : ''}${c.unread ? ' la-chat--unread' : ''}`}
                                        onClick={() => open(c._id)}
                                    >
                                        <span className="la-chat__avatar">{(c.name || '?').charAt(0).toUpperCase()}</span>
                                        <span className="la-chat__body">
                                            <span className="la-chat__top">
                                                <b>{c.name}</b>
                                                <em>{relativeTime(c.lastMessageAt)}</em>
                                            </span>
                                            <span className="la-chat__preview">{c.preview || '—'}</span>
                                            <span className={`la-status la-status--${c.status}`}>{STATUS_LABEL[c.status]}</span>
                                        </span>
                                        {c.unread > 0 && <span className="la-chat__count">{c.unread}</span>}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* ── Conversation ── */}
                <section className="ad-card la-thread">
                    {!openId ? (
                        <div className="la-thread__empty">
                            <FontAwesomeIcon icon={faHeadset} />
                            <p>Choose a chat to read it and reply.</p>
                        </div>
                    ) : !thread ? <Loading label="Opening the chat…" /> : (
                        <>
                            <header className="la-thread__head">
                                <div className="ad-cell-stack">
                                    <b>{thread.name || 'Facebook user'}</b>
                                    <span>Messenger · started {fmtStamp(thread.createdAt)} · {thread.reason}</span>
                                </div>
                                {thread.status !== 'closed' ? (
                                    <button className="ad-btn ad-btn--ghost ad-btn--sm" disabled={busy} onClick={close}
                                            title="Hand the parishioner back to the booking assistant">
                                        <FontAwesomeIcon icon={faCircleXmark} /> End chat
                                    </button>
                                ) : <span className="la-status la-status--closed">Closed</span>}
                            </header>

                            <ol className="la-msgs">
                                {thread.messages.map((m, i) => (
                                    <li key={i} className={`la-msg la-msg--${m.from}`}>
                                        {m.from === 'bot' ? (
                                            <span className="la-msg__note"><FontAwesomeIcon icon={faRobot} /> {m.text}</span>
                                        ) : (
                                            <>
                                                <span className="la-msg__bubble">{m.text}</span>
                                                <span className="la-msg__meta">
                                                    {m.from === 'staff' ? (m.staffName || 'Parish office') : (thread.name || 'Parishioner')} · {fmtStamp(m.at)}
                                                </span>
                                            </>
                                        )}
                                    </li>
                                ))}
                                <li ref={bottom} aria-hidden="true" />
                            </ol>

                            {thread.status === 'closed' ? (
                                <p className="la-thread__closed">This chat has ended. If the parishioner writes again and asks for a person, a new chat opens.</p>
                            ) : !thread.canReply ? (
                                <p className="la-thread__closed">It has been more than 24 hours since their last message, so Messenger will not deliver a reply. End the chat, or reach them another way.</p>
                            ) : (
                                <form className="la-reply" onSubmit={send}>
                                    <textarea
                                        className="ad-input"
                                        rows={2}
                                        value={draft}
                                        placeholder="Enter your reply"
                                        onChange={e => setDraft(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
                                    />
                                    <button className="ad-btn ad-btn--filled" disabled={busy || !draft.trim()}>
                                        <FontAwesomeIcon icon={faPaperPlane} /> Send
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </section>
            </div>
        </>
    );
}
