import axios from 'axios';

/* No request waits for ever: an API that is down or restarting answers
   with an error after this long, and the page carries on without it,
   rather than hanging on a proxy that never replies. Uploads and PDFs
   set their own, longer limit where they are made. */
const TIMEOUT_MS = 20000;

// Public instance — for login / register (no auth header needed)
const axiosPublic = axios.create({
    baseURL: '/api',
    timeout: TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true   // send the jwt cookie on refresh calls
});

// Private instance — interceptors are wired up in useAxiosPrivate hook
const axiosPrivate = axios.create({
    baseURL: '/api',
    timeout: TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

export { axiosPublic, axiosPrivate };
export default axiosPublic;
