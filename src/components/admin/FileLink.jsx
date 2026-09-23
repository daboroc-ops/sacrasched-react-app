import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faFileImage } from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';

/**
 * A paper a requester uploaded, opened for parish staff.
 *
 * The file sits behind an authenticated route, so a plain link would land
 * on a 401 — the access token lives in memory, not in a cookie. It is
 * fetched with the token and opened from a blob URL instead.
 */
export default function FileLink({ file }) {
    const axios = useAxiosPrivate();
    const [busy, setBusy] = useState(false);

    const open = async () => {
        setBusy(true);
        try {
            const res = await axios.get(`/admin-api/files/${file.key}`, { responseType: 'blob', timeout: 60000 });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch {
            // Nothing useful to say beyond the button going back to normal
        } finally {
            setBusy(false);
        }
    };

    const isPdf = file.mimeType === 'application/pdf';
    return (
        <button type="button" className="ad-file" onClick={open} disabled={busy} title={file.name}>
            <FontAwesomeIcon icon={isPdf ? faFilePdf : faFileImage} />
            <span>{file.requirement || file.name || 'File'}</span>
        </button>
    );
}
