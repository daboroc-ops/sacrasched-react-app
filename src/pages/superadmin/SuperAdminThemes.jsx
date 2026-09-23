import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faRotateLeft, faCheck, faDesktop, faUser,
} from '@fortawesome/free-solid-svg-icons';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useTheme from '../../hooks/useTheme';
import { tokensToStyle } from '../../utils/theme';
import { Banner, Loading, ErrorText, ConfirmDialog } from '../../components/admin/AdminUI';
import { ThemePreview } from './ThemePreview';
import FadeImg from '../../components/FadeImg';
import { mediaUrl } from '../../utils/media';

/**
 * Theme editor. Every colour in the devotee and admin templates comes from a
 * CSS custom property, so editing these values re-skins both views — for the
 * whole platform, or for one parish site.
 */
export default function SuperAdminThemes() {
    const axios = useAxiosPrivate();
    const { reload: reloadGlobalTheme } = useTheme();

    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    /* Which parish this edits is decided by the card that opened the page
       and never changes while it is open. */
    const [params] = useSearchParams();
    const scope = params.get('parish') || 'platform';
    const [tokens,  setTokens]  = useState({});
    const [presetId, setPreset] = useState('custom');
    const [saving,  setSaving]  = useState(false);
    const [notice,  setNotice]  = useState(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [nonce,   setNonce]   = useState(0);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/superadmin-api/themes');
                if (!alive) return;
                setData(res.data);
                setError('');
            } catch (err) {
                if (!alive) return;
                setError(err?.response?.data?.message || 'Failed to load themes.');
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [axios, nonce]);

    /* Load the selected scope's saved values into the editor */
    useEffect(() => {
        if (!data) return undefined;

        const timer = setTimeout(() => {
            const source = scope === 'platform'
                ? data.platform
                : data.parishes.find(p => p._id === scope)?.theme;

            setTokens({ ...data.schema.defaults, ...(source?.tokens || {}) });
            setPreset(source?.presetId || (scope === 'platform' ? 'golden-brown' : 'inherit'));
        }, 0);

        return () => clearTimeout(timer);
    }, [data, scope]);

    const schema = data?.schema;

    const groups = useMemo(() => {
        if (!schema) return [];
        return schema.fields.reduce((acc, field) => {
            const group = acc.find(g => g.name === field.group);
            if (group) group.fields.push(field);
            else acc.push({ name: field.group, fields: [field] });
            return acc;
        }, []);
    }, [schema]);

    if (loading) return <Loading label="Loading themes…" />;
    if (error)   return <ErrorText>{error}</ErrorText>;
    if (!data)   return null;

    const currentParish = data.parishes.find(p => p._id === scope);
    const inherits = scope !== 'platform' && !currentParish?.theme;

    const setToken = (key, value) => {
        setTokens(t => ({ ...t, [key]: value }));
        setPreset('custom');
    };

    const applyPreset = preset => {
        setTokens({ ...schema.defaults, ...preset.tokens });
        setPreset(preset.id);
    };

    const save = async () => {
        setSaving(true);
        setNotice(null);
        try {
            await axios.put(`/superadmin-api/themes/${scope}`, { tokens, presetId });
            setNotice({
                tone: 'ok',
                message: scope === 'platform'
                    ? 'Platform theme saved — devotee and admin views now use it.'
                    : `Theme saved for ${currentParish?.name}. It shows on that parish's own site.`
            });
            setNonce(n => n + 1);
            if (scope === 'platform') reloadGlobalTheme();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to save the theme.' });
        } finally {
            setSaving(false);
        }
    };

    const reset = async () => {
        setSaving(true);
        try {
            await axios.delete(`/superadmin-api/themes/${scope}`);
            setConfirmReset(false);
            setNotice({
                tone: 'ok',
                message: scope === 'platform'
                    ? 'Platform theme reset to the SacraSched defaults.'
                    : 'Override removed — this parish follows the platform theme again.'
            });
            setNonce(n => n + 1);
            if (scope === 'platform') reloadGlobalTheme();
        } catch (err) {
            setNotice({ tone: 'bad', message: err?.response?.data?.message || 'Failed to reset the theme.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Link to="/superadmin" className="sa-back">&larr; All parishes</Link>

            {/* Which parish this is was decided by the card that opened the
                page, so the editor states it rather than asking again. */}
            <section className="tb">
                <div className="tb__art" aria-hidden="true">
                    {currentParish?.cover
                        ? <FadeImg src={mediaUrl(currentParish.cover.url)} alt="" className="tb__photo" />
                        : <span className="tb__fallback" />}
                    <span className="tb__veil" />
                </div>
                <div className="tb__body">
                    <span className="tb__eyebrow">Appearance</span>
                    <h2 className="tb__name">
                        {scope === 'platform' ? 'Platform default' : currentParish?.name || 'This parish'}
                    </h2>
                    <p className="tb__sub">
                        {scope === 'platform'
                            ? 'Used by every view that has no theme of its own.'
                            : currentParish?.subdomain
                                ? `Served on ${currentParish.subdomain}`
                                : 'This parish has no website yet'}
                    </p>
                </div>
            </section>

            {inherits && (
                <p className="sa-hint">
                    This parish has no theme of its own yet. Editing below creates one —
                    it will only be served on its own subdomain.
                </p>
            )}
            {scope !== 'platform' && !currentParish?.subdomain && (
                <p className="sa-hint">
                    Heads up: this parish has no subdomain, so a theme saved here is stored
                    but never served. Issue a subdomain under Parishes first.
                </p>
            )}

            <Banner {...(notice || {})} onDismiss={() => setNotice(null)} />

            {/* ── Presets ── */}
            <section className="ad-card">
                <header className="ad-card__head">
                    <h3>Presets</h3>
                    <span className="ad-card__meta">A starting point you can then tune</span>
                </header>

                <div className="sa-presets">
                    {schema.presets.map(preset => {
                        const t = { ...schema.defaults, ...preset.tokens };
                        return (
                            <button
                                key={preset.id}
                                className={`sa-preset ${presetId === preset.id ? 'sa-preset--active' : ''}`}
                                onClick={() => applyPreset(preset)}
                            >
                                <span className="sa-preset__swatches">
                                    {['--brand', '--brand-dark', '--gold', '--brand-light', '--surface-2'].map(k => (
                                        <span key={k} style={{ background: t[k] }} />
                                    ))}
                                </span>
                                <span className="sa-preset__name">
                                    {preset.name}
                                    {presetId === preset.id && <FontAwesomeIcon icon={faCheck} />}
                                </span>
                                <span className="sa-preset__desc">{preset.description}</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ── Editor + preview ── */}
            <div className="sa-theme-grid">
                <section className="ad-card">
                    <header className="ad-card__head">
                        <h3>Colours</h3>
                        <span className="ad-card__meta">{presetId === 'custom' ? 'Custom' : schema.presets.find(p => p.id === presetId)?.name || '—'}</span>
                    </header>

                    {groups.map(group => (
                        <div className="sa-token-group" key={group.name}>
                            <p className="sa-token-group__title">{group.name}</p>

                            {group.fields.map(field => (
                                <div className="sa-token" key={field.key}>
                                    <div className="sa-token__label">
                                        <span>{field.label}</span>
                                        {field.hint && <small>{field.hint}</small>}
                                    </div>

                                    {field.type === 'color' ? (
                                        <div className="sa-token__inputs">
                                            <input
                                                type="color"
                                                className="sa-token__swatch"
                                                value={normaliseHex(tokens[field.key])}
                                                onChange={e => setToken(field.key, e.target.value.toUpperCase())}
                                                aria-label={field.label}
                                            />
                                            <input
                                                type="text"
                                                className="ad-input sa-token__hex"
                                                value={tokens[field.key] || ''}
                                                onChange={e => setToken(field.key, e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="sa-token__inputs">
                                            <input
                                                type="range"
                                                min="0" max="20"
                                                value={parseInt(tokens[field.key]) || 0}
                                                onChange={e => setToken(field.key, `${e.target.value}px`)}
                                                className="sa-token__range"
                                            />
                                            <input
                                                type="text"
                                                className="ad-input sa-token__hex"
                                                value={tokens[field.key] || ''}
                                                onChange={e => setToken(field.key, e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}

                    <div className="ad-form__actions">
                        <button
                            className="ad-btn ad-btn--ghost"
                            onClick={() => setConfirmReset(true)}
                            disabled={saving || (scope !== 'platform' && inherits)}
                        >
                            <FontAwesomeIcon icon={faRotateLeft} />
                            {scope === 'platform' ? ' Reset to defaults' : ' Remove override'}
                        </button>
                        <button className="ad-btn ad-btn--filled" onClick={save} disabled={saving}>
                            {saving ? 'Saving…' : 'Save theme'}
                        </button>
                    </div>
                </section>

                <section className="ad-card sa-preview-card">
                    <header className="ad-card__head">
                        <h3>Live preview</h3>
                        <span className="ad-card__meta">Updates as you edit</span>
                    </header>

                    <div className="sa-preview" style={tokensToStyle(tokens)}>
                        <p className="sa-preview__label"><FontAwesomeIcon icon={faDesktop} /> Admin template</p>
                        <ThemePreview variant="admin" />

                        <p className="sa-preview__label"><FontAwesomeIcon icon={faUser} /> Devotee template</p>
                        <ThemePreview variant="devotee" />
                    </div>
                </section>
            </div>

            {confirmReset && (
                <ConfirmDialog
                    title={scope === 'platform' ? 'Reset the platform theme?' : 'Remove this override?'}
                    confirmLabel={scope === 'platform' ? 'Reset' : 'Remove'}
                    message={scope === 'platform'
                        ? 'Every view goes back to the SacraSched golden-brown defaults. Parish overrides are untouched.'
                        : 'This parish site will follow the platform theme again.'}
                    busy={saving}
                    onCancel={() => setConfirmReset(false)}
                    onConfirm={reset}
                />
            )}
        </>
    );
}

/** <input type="color"> only accepts #rrggbb — everything else falls back. */
function normaliseHex(value) {
    const v = String(value || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v;
    if (/^#[0-9a-f]{3}$/i.test(v)) return '#' + v.slice(1).split('').map(c => c + c).join('');
    return '#000000';
}
