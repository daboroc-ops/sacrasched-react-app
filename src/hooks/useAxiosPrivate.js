import { useEffect } from 'react';
import { axiosPrivate } from '../api/axios';
import useAuth from './useAuth';
import useRefreshToken from './useRefreshToken';

const useAxiosPrivate = () => {
    const { auth } = useAuth();
    const refresh  = useRefreshToken();

    useEffect(() => {
        // Attach access token to every request
        const reqIntercept = axiosPrivate.interceptors.request.use(
            config => {
                if (!config.headers['Authorization']) {
                    config.headers['Authorization'] = `Bearer ${auth?.accessToken}`;
                }
                return config;
            },
            err => Promise.reject(err)
        );

        // On 403 (expired token), silently refresh and retry once
        const resIntercept = axiosPrivate.interceptors.response.use(
            res => res,
            async err => {
                const prev = err?.config;
                if (err?.response?.status === 403 && !prev?.sent) {
                    prev.sent = true;
                    const newToken = await refresh();
                    prev.headers['Authorization'] = `Bearer ${newToken}`;
                    return axiosPrivate(prev);
                }
                return Promise.reject(err);
            }
        );

        return () => {
            axiosPrivate.interceptors.request.eject(reqIntercept);
            axiosPrivate.interceptors.response.eject(resIntercept);
        };
    }, [auth, refresh]);

    return axiosPrivate;
};

export default useAxiosPrivate;
