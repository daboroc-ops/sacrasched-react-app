import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileArrowUp, faFilePdf, faFileImage, faXmark, faCircleCheck, faPlus } from '@fortawesome/free-solid-svg-icons';

const MAX_MB    = 10;
const MAX_FILES = 10;                       // in all — the API keeps no more
const ACCEPT    = 'image/jpeg,image/png,image/webp,application/pdf';
const OTHER     = 'Other supporting documents';

/**
 * The papers a request needs — a birth certificate for a baptismal
 * certificate, the parents' marriage record for a baptism — uploaded
 * against the list the parish set for that service. A requirement may
 * take several files (both sides of an ID, a scan that runs to pages),
 * and there is always a slot for anything else the requester was told to
 * bring.
 *
 * `upload(file, requirement)` is supplied by the form: it knows whether this
 * is a guest (with a confirmation token) or a signed-in devotee, and answers
 * with the stored file's description. What comes back here is the list of
 * attachments to send with the request.
 *
 * Without an `upload`, the file is held as picked — `{ file, name, … }` —
 * for the form to send when it has what the server needs to accept it; the
 * guest form does this because the contact is only proved on its last step.
 */
export default function RequirementUploads({ requirements = [], value = [], onChange, upload }) {
    const [busy,  setBusy]  = useState('');
    const [error, setError] = useState('');

    const slots = [...requirements, OTHER];
    const room  = MAX_FILES - value.length;

    const pick = async (requirement, files) => {
        const list = [...(files || [])];
        if (!list.length) return;
        setError('');
        if (list.length > room) return setError(`You can attach up to ${MAX_FILES} files in all — ${room} more.`);
        for (const file of list) {
            if (file.size > MAX_MB * 1024 * 1024) return setError(`${file.name} is larger than ${MAX_MB} MB.`);
            if (!ACCEPT.split(',').includes(file.type)) return setError('Only JPG, PNG, WebP images or PDF files are accepted.');
        }

        if (!upload) {
            onChange([...value, ...list.map(file => ({ file, name: file.name, mimeType: file.type, size: file.size, requirement }))]);
            return;
        }

        setBusy(requirement);
        try {
            const stored = [];
            for (const file of list) stored.push({ ...(await upload(file, requirement)), requirement });
            onChange([...value, ...stored]);
        } catch (err) {
            setError(err?.response?.data?.message || 'Upload failed. Please try again.');
        } finally {
            setBusy('');
        }
    };

    const remove = item => onChange(value.filter(a => a !== item));

    return (
        <div className="form-group form-group--full">
            <div className="rq">
                {slots.map(req => {
                    const files = value.filter(a => a.requirement === req);
                    const other = req === OTHER;
                    return (
                        <div key={req} className={`rq__row${files.length ? ' rq__row--done' : ''}${other ? ' rq__row--other' : ''}`}>
                            <div className="rq__what">
                                <FontAwesomeIcon icon={files.length ? faCircleCheck : faFileArrowUp} className="rq__icon" />
                                <span>{req}{other && <small> (optional)</small>}</span>
                            </div>

                            <div className="rq__files">
                                {files.map((f, i) => (
                                    <div key={f.key || f.name + i} className="rq__file">
                                        <FontAwesomeIcon icon={f.mimeType === 'application/pdf' ? faFilePdf : faFileImage} />
                                        <span className="rq__name" title={f.name}>{f.name}</span>
                                        <button type="button" className="rq__remove" onClick={() => remove(f)} aria-label={`Remove ${f.name}`}>
                                            <FontAwesomeIcon icon={faXmark} />
                                        </button>
                                    </div>
                                ))}
                                {room > 0 && (
                                    <label className={`rq__pick${busy === req ? ' rq__pick--busy' : ''}${files.length ? ' rq__pick--more' : ''}`}>
                                        <input
                                            type="file"
                                            accept={ACCEPT}
                                            multiple
                                            disabled={Boolean(busy)}
                                            onChange={e => { pick(req, e.target.files); e.target.value = ''; }}
                                        />
                                        {busy === req ? 'Uploading…' : files.length ? <><FontAwesomeIcon icon={faPlus} /> Add another file</> : 'Choose file(s)'}
                                    </label>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="form-hint">
                Image or PDF, up to {MAX_MB} MB each and {MAX_FILES} files in all. You can attach more than one file for a requirement.
                {upload ? ' Only the parish office can open these.' : ' They are sent with the request; only the parish office can open them.'}
            </p>
            {error && <p className="form-error">{error}</p>}
        </div>
    );
}
