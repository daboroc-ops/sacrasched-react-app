import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import * as R from '../utils/roles';

/**
 * Auth state plus role helpers derived from the token's roles array.
 * `roles` comes back from POST /login and GET /refresh, so it survives
 * a page reload through PersistLogin.
 */
const useAuth = () => {
    const ctx   = useContext(AuthContext);
    const roles = ctx?.auth?.roles ?? [];

    return {
        ...ctx,
        roles,
        isSuperAdmin: R.isSuperAdmin(roles),
        isAdmin:   R.isAdmin(roles),
        isEditor:  R.isEditor(roles),
        isStaff:   R.isStaff(roles),
        roleLabel: R.roleLabel(roles),
        homePath:  R.homePathFor(roles),
    };
};

export default useAuth;
