import axiosPublic from '../api/axios';
import useAuth from './useAuth';
import { noteSession } from '../utils/session';

const useRefreshToken = () => {
    const { setAuth } = useAuth();

    const refresh = async () => {
        const res = await axiosPublic.get('/refresh');
        noteSession();
        setAuth(prev => ({
            ...prev,
            accessToken: res.data.accessToken,
            // roles drive which dashboard renders — keep them in sync on every refresh
            ...(res.data.roles ? { roles: res.data.roles } : {}),
            ...(res.data.user  ? { user:  res.data.user  } : {}),
        }));
        return res.data.accessToken;
    };

    return refresh;
};

export default useRefreshToken;
