import { createContext, useState } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    // auth shape: {
    //   accessToken,
    //   roles: [2001, 1984, 5150],   // role codes — see utils/roles.js
    //   user: { id, username, firstname, lastname, email, contactNumber }
    // }
    const [auth, setAuth] = useState({});

    return (
        <AuthContext.Provider value={{ auth, setAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
