/**
 * Whether this browser has signed in before — nothing secret, just a note
 * so the app knows whether asking the API to refresh a session is worth
 * the request. The httpOnly cookie is the actual session; this only says
 * one may exist.
 */
const KEY = 'ss.session';

export const hadSession   = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return true; } };
export const noteSession  = () => { try { localStorage.setItem(KEY, '1'); } catch { /* storage blocked: we just ask every time */ } };
export const clearSession = () => { try { localStorage.removeItem(KEY); } catch { /* likewise */ } };
