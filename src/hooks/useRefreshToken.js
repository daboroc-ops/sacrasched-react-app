import axiosPublic from '../api/axios';
import useAuth from './useAuth';

const useRefreshToken = () => {
    const { setAuth } = useAuth();

    const refresh = async () => {
        const res = await axiosPublic.get('/refresh');
        setAuth(prev => ({
            ...prev,
            accessToken: res.data.accessToken
        }));
        return res.data.accessToken;
    };

    return refresh;
};

export default useRefreshToken;
