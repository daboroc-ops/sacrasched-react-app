import axios from 'axios';

// Public instance — for login / register (no auth header needed)
const axiosPublic = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true   // send the jwt cookie on refresh calls
});

// Private instance — interceptors are wired up in useAxiosPrivate hook
const axiosPrivate = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

export { axiosPublic, axiosPrivate };
export default axiosPublic;
