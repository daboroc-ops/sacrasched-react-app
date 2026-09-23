import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ParishProvider } from './context/ParishContext';
import useAuth from './hooks/useAuth';
import useTheme from './hooks/useTheme';
import useParish from './hooks/useParish';

import Landing        from './pages/Landing';
import ParishLanding  from './pages/ParishLanding';
import PersistLogin   from './components/PersistLogin';

/* Every page but the public landing loads on demand — a visitor to a
   parish page never downloads the admin, the console or the dashboard. */
const ParishPost = lazy(() => import('./pages/ParishPost'));
const AdminPosts = lazy(() => import('./pages/admin/AdminPosts'));
const TrackRequest = lazy(() => import('./pages/TrackRequest'));
const BookPage = lazy(() => import('./pages/BookPage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const SuperAdminGate = lazy(() => import('./pages/SuperAdminGate'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminRequests = lazy(() => import('./pages/admin/AdminRequests'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminCalendar = lazy(() => import('./pages/admin/AdminCalendar'));
const AdminConfig = lazy(() => import('./pages/admin/AdminConfig'));
const AdminContent = lazy(() => import('./pages/admin/AdminContent'));
const SuperAdminLayout = lazy(() => import('./pages/superadmin/SuperAdminLayout'));
const SuperAdminOverview = lazy(() => import('./pages/superadmin/SuperAdminOverview'));
const SuperAdminLogs = lazy(() => import('./pages/superadmin/SuperAdminLogs'));
const SuperAdminAccounts = lazy(() => import('./pages/superadmin/SuperAdminAccounts'));
const SuperAdminOfferings = lazy(() => import('./pages/superadmin/SuperAdminOfferings'));
const SuperAdminThemes = lazy(() => import('./pages/superadmin/SuperAdminThemes'));



/**
 * Clears the boot splash in index.html once the two things that change how the
 * app *looks* have landed: the theme (colours are written onto :root) and the
 * parish (branding and names). Until then the markup below is already mounted
 * and painting underneath, so images start downloading during the splash
 * rather than after it.
 *
 * The node is removed rather than hidden so it can never trap a click, and it
 * is removed after the fade rather than at the same moment, so the transition
 * is actually seen.
 *
 * And it never waits for ever: if the API is slow to answer (restarting,
 * say) the splash goes after a few seconds anyway and the page shows with
 * its default look — a plain page beats a spinner that never ends.
 */
const SPLASH_MAX_MS = 6000;

function BootSplash() {
    const { loading: themeLoading }  = useTheme();
    const { loading: parishLoading } = useParish();
    const ready = !themeLoading && !parishLoading;

    useEffect(() => {
        const splash = document.getElementById('app-boot');
        if (!splash) return;

        const clear = () => {
            splash.classList.add('app-boot--done');
            setTimeout(() => splash.remove(), 400);
        };
        if (ready) { clear(); return; }

        const cap = setTimeout(clear, SPLASH_MAX_MS);
        return () => clearTimeout(cap);
    }, [ready]);

    return null;
}

/* ── Protected route wrapper ─────────────────────────────────── */
function RequireAuth() {
    const { auth } = useAuth();
    return auth?.accessToken
        ? <Outlet />
        : <Navigate to="/login" replace />;
}

/* ── Staff-only wrapper (Admin or Editor) ────────────────────── */
function RequireStaff() {
    const { isStaff } = useAuth();
    return isStaff
        ? <Outlet />
        : <Navigate to="/dashboard" replace />;
}

/* ── Admin-only wrapper — editors get bounced to the overview ── */
function RequireAdmin() {
    const { isAdmin } = useAuth();
    return isAdmin
        ? <Outlet />
        : <Navigate to="/admin" replace />;
}

/* ── Platform-owner wrapper ──────────────────────────────────── */
function RequireSuperAdmin() {
    const { isSuperAdmin } = useAuth();
    return isSuperAdmin
        ? <Outlet />
        : <Navigate to="/dashboard" replace />;
}

/**
 * /dashboard is the single post-login destination. It reads the roles that
 * came back with the token and picks the dashboard: superadmins get the
 * platform console, other staff the parish admin, everyone else the
 * devotee dashboard.
 */
function DashboardRouter() {
    const { isSuperAdmin, isStaff } = useAuth();
    if (isSuperAdmin) return <Navigate to="/superadmin" replace />;
    return isStaff ? <Navigate to="/admin" replace /> : <Dashboard />;
}

function App() {
    return (
        <ParishProvider>
        <ThemeProvider>
        <AuthProvider>
            <BootSplash />
            <BrowserRouter>
                <Suspense fallback={<div className="app-lazy" aria-busy="true" />}>
                <Routes>
                    <Route path="/login"    element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />

                    {/* The platform console's private entrance. The key is
                        checked by the server, not by anything in this bundle —
                        a wrong one renders the same "not found" page as any
                        other bad address. Declared last among the two-segment
                        routes so real paths like /parish/:subdomain still win;
                        React Router ranks a static segment above a dynamic one
                        regardless of order, but keeping it here makes that
                        obvious to the next reader. */}
                    <Route path="/:gateKey/superadmin" element={<SuperAdminGate />} />

                    {/* Where the guest confirmation email's link lands — public,
                        since a guest has no account to sign in to. */}
                    <Route path="/track" element={<TrackRequest />} />

                    {/* A post from the parish's news — on its own site, and
                        under the parish's page on the platform */}
                    <Route path="/news/:slug" element={<ParishPost />} />
                    <Route path="/parish/:subdomain/news/:slug" element={<ParishPost />} />

                    {/* The booking wizard on its own page — the calendar sends
                        the day and the service along in the query string */}
                    <Route path="/book" element={<BookPage />} />
                    <Route path="/parish/:subdomain/book" element={<BookPage />} />

                    <Route element={<PersistLogin />}>
                        {/* Public landing page — auth is restored first so the
                            page can greet signed-in users with a dashboard link */}
                        <Route path="/" element={<Landing />} />

                        {/* A parish's own welcome page, reachable from the
                            directory without needing that parish's subdomain */}
                        <Route path="/parish/:subdomain" element={<ParishLanding />} />

                        <Route element={<RequireAuth />}>
                            <Route path="/"                  element={<Dashboard />} />
                            <Route path="/dashboard"         element={<Dashboard />} />
                            <Route path="/payment/success"   element={<PaymentSuccess />} />
                            <Route path="/payment/cancel"    element={<PaymentCancel />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
            </BrowserRouter>
        </AuthProvider>
        </ThemeProvider>
        </ParishProvider>
    );
}

export default App;
