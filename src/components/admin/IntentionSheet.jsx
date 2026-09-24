import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFilePowerpoint, faXmark } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { fmtTime } from '../../utils/format';

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * The intentions for one Mass, to take out of the system: pick the day and
 * the Mass (from the parish's own schedule for that weekday) and download
 * the sheet — as a PDF to print for the priest, or as a PowerPoint to flash
 * on the screen in church. Both are laid out the way the parish reads them.
 */
export default function IntentionSheet() {
    const axios = useAxiosPrivate();
    const [date, setDate] = useState(todayStr());
    const [time, setTime] = useState('');
    const [busy, setBusy] = useState('');     // which format is being made
    const [error, setError] = useState('');

    /* Folded away until wanted. Clicking anywhere else puts it away again —
       it sits over the table, and a panel left open would hide the rows it
       was opened to print. */
    const [open, setOpen] = useState(false);
    const panel = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        const away = e => { if (panel.current && !panel.current.contains(e.target)) setOpen(false); };
        const esc  = e => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', away);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', away);
            document.removeEventListener('keydown', esc);
        };
    }, [open]);

    // The parish's week of Masses; the sheet is for whichever was said on
    // that day — past days included, for yesterday's sheet.
    const [week, setWeek] = useState(null);
    useEffect(() => {
        let alive = true;
        axios.get('/user/mass-schedule').then(r => { if (alive) setWeek(r.data?.days || {}); }).catch(() => { if (alive) setWeek({}); });
        return () => { alive = false; };
    }, [axios]);
    const dow = date ? new Date(date + 'T00:00:00').getDay() : null;
    const masses = (week && dow != null ? week[['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dow]] : []) || [];

    const download = async format => {
        if (!date || !time) return;
        setBusy(format); setError('');
        try {
            const res = await axios.get('/admin-api/mass-intentions/export', { params: { date, time, format }, responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url; a.download = `mass-intentions-${date}-${time.replace(':', '')}.${format}`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setError('Could not make the sheet.');
        } finally {
            setBusy('');
        }
    };

    /* Open only while someone is actually printing a sheet: the date, the
       Mass and the two buttons are three controls that otherwise sit on the
       page all day taking the table's room. */
    if (!open) {
        return (
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setOpen(true)}
                    title="Print the intentions booked for one Mass">
                <FontAwesomeIcon icon={faFilePdf} /> Sheet
            </button>
        );
    }

    return (
        <div className="ad-sheet" ref={panel} title="The intentions booked for one Mass — a PDF to print, or a PowerPoint for the screen">
            <input className="ad-input ad-input--short" type="date" value={date} onChange={e => { setDate(e.target.value); setTime(''); }} />
            <select className="ad-select" value={time} onChange={e => setTime(e.target.value)} disabled={!masses.length}>
                <option value="">{!week ? 'Loading Masses…' : masses.length ? 'Which Mass?' : 'No Mass that day'}</option>
                {masses.map(m => <option key={m.time} value={m.time}>{fmtTime(m.time)}{m.label ? ` — ${m.label}` : ''}</option>)}
            </select>
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => download('pdf')} disabled={!time || Boolean(busy)}>
                <FontAwesomeIcon icon={faFilePdf} /> {busy === 'pdf' ? 'Preparing…' : 'PDF'}
            </button>
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => download('pptx')} disabled={!time || Boolean(busy)}>
                <FontAwesomeIcon icon={faFilePowerpoint} /> {busy === 'pptx' ? 'Preparing…' : 'PPT'}
            </button>
            <button type="button" className="ad-btn ad-btn--ghost ad-btn--icon ad-sheet__close"
                    onClick={() => setOpen(false)} title="Close" aria-label="Close">
                <FontAwesomeIcon icon={faXmark} />
            </button>
            {error && <span className="ad-field__problem">{error}</span>}
        </div>
    );
}
