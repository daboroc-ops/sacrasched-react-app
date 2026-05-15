import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import useAuth from './hooks/useAuth';

import Login          from './pages/Login';
import Register       from './pages/Register';
import Dashboard      from './pages/Dashboard';
import PersistLogin   from './components/PersistLogin';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel  from './pages/PaymentCancel';

/* ── Protected route wrapper ─────────────────────────────────── */
function RequireAuth() {
    const { auth } = useAuth();
    return auth?.accessToken
        ? <Outlet />
        : <Navigate to="/login" replace />;
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login"    element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    <Route element={<PersistLogin />}>
                        <Route element={<RequireAuth />}>
                            <Route path="/"                  element={<Dashboard />} />
                            <Route path="/dashboard"         element={<Dashboard />} />
                            <Route path="/payment/success"   element={<PaymentSuccess />} />
                            <Route path="/payment/cancel"    element={<PaymentCancel />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
