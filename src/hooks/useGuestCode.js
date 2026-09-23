import { useState, useEffect } from 'react';
import axiosPublic from '../api/axios';

/**
 * Proving a guest owns a contact — a mobile number or an email address —
 * with a six-digit code sent to it.
 *
 * The server hands back a signed token on success; it travels with the
 * booking and is checked again there, so "confirmed" is never just a flag in
 * the browser. Changing the value after confirming drops the token: one
 * confirmed number must not wave a different one through.
 *
 * @param {'phone'|'email'} channel
 */
export default function useGuestCode(channel) {
    const [value,    setValue]    = useState('');
    const [token,    setToken]    = useState('');
    const [code,     setCode]     = useState('');
    const [sent,     setSent]     = useState(false);
    const [busy,     setBusy]     = useState(false);
    const [msg,      setMsg]      = useState('');
    const [cooldown, setCooldown] = useState(0);

    // Ticks the resend cooldown down to zero.
    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const field = channel === 'phone' ? 'phone' : 'email';

    const change = next => {
        setValue(next);
        if (token) { setToken(''); setSent(false); setCode(''); }
        setMsg('');
    };

    const reset = () => { setToken(''); setSent(false); setCode(''); setMsg(''); };

    const send = async () => {
        setBusy(true); setMsg('');
        try {
            const res = await axiosPublic.post(`/guest/${channel}/send-code`, { [field]: value.trim() });
            setSent(true);
            setCooldown(60);
            setMsg(res.data?.configured === false
                ? (channel === 'phone'
                    ? 'SMS is not configured on this server — the code was written to the server console.'
                    : 'Email is not configured on this server — the code was written to the server console.')
                : (channel === 'phone'
                    ? `Code sent by text to ${value.trim()}.`
                    : `Code sent to ${value.trim()}. Check your inbox and spam folder.`));
        } catch (err) {
            const retry = err?.response?.data?.retryAfter;
            if (retry) setCooldown(retry);
            setMsg(err?.response?.data?.message || 'Could not send the code. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const verify = async () => {
        setBusy(true); setMsg('');
        try {
            const res = await axiosPublic.post(`/guest/${channel}/verify-code`, { [field]: value.trim(), code });
            setToken(res.data.token);
        } catch (err) {
            setMsg(err?.response?.data?.message || 'That code could not be checked.');
        } finally {
            setBusy(false);
        }
    };

    return { value, change, token, code, setCode, sent, busy, msg, cooldown, send, verify, reset };
}
