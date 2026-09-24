import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTableColumns, faUsers, faCalendarDays, faCreditCard, faHandsPraying,
    faChurch, faDove, faFileLines, faBuildingColumns, faGear, faImages, faNewspaper, faCross,
    faBars, faXmark, faRightFromBracket, faShieldHalved,
    faAnglesLeft, faAnglesRight,
} from '@fortawesome/free-solid-svg-icons';
import useAuth from '../../hooks/useAuth';
import useParish from '../../hooks/useParish';
import useLogout from '../../hooks/useLogout';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import SidebarBanner from '../../components/SidebarBanner';

/* Whether the sidebar was left folded. Kept per browser, like the fold
   state of the Configuration cards: a choice about this screen, on this
   machine, that nobody else needs to know about. */
const FOLD_KEY = 'sacrasched.admin.sidebarCollapsed';
const recallFold = () => {
    try { return JSON.parse(localStorage.getItem(FOLD_KEY)) === true; } catch { return false; }
};
const rememberFold = v => {
    try { localStorage.setItem(FOLD_KEY, JSON.stringify(v)); } catch { /* private mode */ }
};

/* adminOnly items are hidden from editors — the API rejects them too. */
const NAV = [
    { to: '/admin',                    label: 'Dashboard',         icon: faTableColumns,    end: true },
    { to: '/admin/users',              label: 'Users',             icon: faUsers,           adminOnly: true },
    { to: '/admin/calendar',           label: 'Calendar',          icon: faCalendarDays },
    { to: '/admin/payments',           label: 'Payments',          icon: faCreditCard,      adminOnly: true },
    { to: '/admin/blessings',          label: 'Blessings',         icon: faHandsPraying },
    { to: '/admin/mass-intentions',    label: 'Mass Intentions',   icon: faChurch },
    { to: '/admin/occasional-masses',  label: 'Occasional Masses', icon: faCross },
    { to: '/admin/sacraments',         label: 'Sacraments',        icon: faDove },
    { to: '/admin/document-requests',  label: 'Document Requests', icon: faFileLines },
    { to: '/admin/facility-bookings',  label: 'Facility Bookings', icon: faBuildingColumns },
];

const SETTINGS = [
    { to: '/admin/posts',   label: 'Posts',   icon: faNewspaper },
    { to: '/admin/content', label: 'Content', icon: faImages },
    { to: '/admin/config', label: 'Configuration', icon: faGear },
];

/**
 * Staff are scoped to one parish. Until the platform owner assigns one, every
 * /admin-api call is refused — so say so plainly instead of leaving a
 * dashboard full of empty tables that looks like a bug.
 */
function NoParishNotice() {
    return (
        <div className="ad-empty-scope">
            <FontAwesomeIcon icon={faShieldHalved} className="ad-empty-scope__icon" />
            <h2>No parish assigned to this account</h2>
            <p>
                Staff dashboards show one parish&rsquo;s records. Your account has not
                been assigned to a parish yet, so there is nothing here to show.
            </p>
            <p className="ad-empty-scope__hint">
                Ask the SacraSched platform owner to assign your account under
                <b> Platform Accounts</b> in the superadmin console.
            </p>
        </div>
    );
}

export default function AdminLayout() {
    const { auth, isAdmin, roleLabel } = useAuth();
    const { parish, isTenant } = useParish();
    const location = useLocation();
    const axios = useAxiosPrivate();
    const [menuOpen, setMenu] = useState(false);
    const [collapsed, setCollapsed] = useState(recallFold);

    const toggleFold = () => setCollapsed(c => { rememberFold(!c); return !c; });

    // null while the probe is in flight — the dashboard renders as usual until
    // we know, so the common case never flickers through a warning.
    const [scope, setScope] = useState(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await axios.get('/admin-api/me');
                if (alive) setScope(res.data);
            } catch {
                if (alive) setScope({ hasParish: true });   // let the pages report their own errors
            }
        })();
        return () => { alive = false; };
    }, [axios]);

    const user = auth?.user;
    const name = user ? `${user.firstname} ${user.lastname}` : (user?.username || 'Admin');
    const initials = (user?.firstname?.[0] || 'A').toUpperCase();

    const handleLogout = useLogout();

    const visible = NAV.filter(item => !item.adminOnly || isAdmin);
    const current = [...NAV, ...SETTINGS].find(i =>
        i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)
    );

    const link = item => (
        <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            // Folded, the label is hidden and the tooltip is all there is
            title={item.label}
            className={({ isActive }) => `ad-nav__item ${isActive ? 'ad-nav__item--active' : ''}`}
            onClick={() => setMenu(false)}
        >
            <FontAwesomeIcon icon={item.icon} className="ad-nav__icon" />
            <span>{item.label}</span>
        </NavLink>
    );

    return (
        <div className="ad-shell">

            {/* ── Header ── */}
            <header className="ad-header">
                <div className="ad-header__left">
                    <button
                        className="ad-header__menu"
                        onClick={() => setMenu(o => !o)}
                        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
                        aria-expanded={menuOpen}
                    >
                        <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
                    </button>
                    <img src="/favicon.svg" alt="" className="ad-header__mark" />
                    <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="ad-header__wordmark" />
                    <span className="ad-header__pill">{roleLabel}</span>
                    {isTenant && <span className="ad-header__tenant">{parish.name}</span>}
                </div>

                <div className="ad-header__right">
                    <span className="ad-header__user">
                        <span className="ad-header__avatar">{initials}</span>
                        {name}
                    </span>
                    <button className="ad-header__logout" onClick={handleLogout}>
                        <FontAwesomeIcon icon={faRightFromBracket} />
                        <span>Logout</span>
                    </button>
                </div>
            </header>

            <div className="ad-body">
                {menuOpen && <div className="ad-backdrop" onClick={() => setMenu(false)} />}

                {/* ── Sidebar ── */}
                <aside className={`ad-sidebar ${menuOpen ? 'ad-sidebar--open' : ''}${collapsed ? ' ad-sidebar--collapsed' : ''}`}>
                    <SidebarBanner subtitle={roleLabel} collapsed={collapsed} />

                    <p className="ad-sidebar__label">Navigation</p>
                    <nav className="ad-nav">{visible.map(link)}</nav>

                    {isAdmin && (
                        <>
                            <div className="ad-sidebar__divider" />
                            <p className="ad-sidebar__label">Settings</p>
                            <nav className="ad-nav">{SETTINGS.map(link)}</nav>
                        </>
                    )}

                    {/* At the foot, out of the way of the navigation itself */}
                    <button
                        type="button"
                        className="ad-sidebar__fold"
                        onClick={toggleFold}
                        title={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
                        aria-label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
                        aria-expanded={!collapsed}
                    >
                        <FontAwesomeIcon icon={collapsed ? faAnglesRight : faAnglesLeft} className="ad-nav__icon" />
                        <span>Collapse</span>
                    </button>
                </aside>

                {/* ── Page ── */}
                <main className="ad-main">
                    {scope && !scope.hasParish ? (
                        <NoParishNotice />
                    ) : (
                        <>
                            <h1 className="ad-page-title">{current?.label || 'Admin'}</h1>
                            <Outlet />
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
