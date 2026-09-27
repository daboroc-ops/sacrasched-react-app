import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarDays, faBell, faBars, faXmark, faRightFromBracket, faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import useAuth from '../../hooks/useAuth';
import useLogout from '../../hooks/useLogout';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import SidebarBanner from '../../components/SidebarBanner';

/* How often the bell re-checks for something new while the page is open */
const POLL_MS = 60 * 1000;

const NAV = [
    { to: '/priest',               label: 'My Calendar',   icon: faCalendarDays, end: true },
    { to: '/priest/notifications', label: 'Notifications', icon: faBell, badge: true },
];

/* Pages reached from the header rather than the sidebar */
const HEADER_PAGES = [
    { to: '/priest/profile', label: 'Priest Profile' },
];

/**
 * The priest's dashboard: the same shell as the parish admin, with only
 * what a priest needs — what he presides at, and what he has been told.
 * Nothing here changes a booking; that is the parish office's.
 */
export default function PriestLayout() {
    const { auth, roleLabel } = useAuth();
    const axios    = useAxiosPrivate();
    const location = useLocation();
    const logout   = useLogout();

    const [menuOpen, setMenu] = useState(false);
    const [profile,  setProfile] = useState(null);
    const [unread,   setUnread]  = useState(0);

    useEffect(() => {
        let alive = true;
        axios.get('/priest-api/me')
            .then(res => { if (alive) setProfile(res.data); })
            .catch(() => { if (alive) setProfile({ parish: undefined }); });
        return () => { alive = false; };
    }, [axios]);

    const refreshUnread = useCallback(async () => {
        try {
            const res = await axios.get('/priest-api/notifications', { params: { limit: 1, unread: 1 } });
            setUnread(res.data.unread || 0);
        } catch { /* the bell just stays as it was */ }
    }, [axios]);

    useEffect(() => {
        // Read on arrival, then keep checking while the tab is open
        const first = setTimeout(refreshUnread, 0);
        const timer = setInterval(refreshUnread, POLL_MS);
        return () => { clearTimeout(first); clearInterval(timer); };
    }, [refreshUnread]);

    const user = auth?.user;
    const name = profile?.label || (user ? `${user.firstname} ${user.lastname}` : 'Priest');
    const initials = (user?.firstname?.[0] || 'P').toUpperCase();
    const current = [...NAV, ...HEADER_PAGES].find(i => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)));

    return (
        <div className="ad-shell">
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
                    {profile?.parish && <span className="ad-header__tenant">{profile.parish.name}</span>}
                </div>

                <div className="ad-header__right">
                    <NavLink to="/priest/notifications" className="pr-bell" title={`${unread} unread`} aria-label={`Notifications, ${unread} unread`}>
                        <FontAwesomeIcon icon={faBell} />
                        {unread > 0 && <span className="pr-bell__count">{unread > 99 ? '99+' : unread}</span>}
                    </NavLink>
                    {/* The account: opens the Priest Profile — his details and password */}
                    <NavLink to="/priest/profile" className="ad-header__user ad-header__user--link" title="Your profile">
                        <span className="ad-header__avatar">{initials}</span>
                        <span className="ad-header__name">{name}</span>
                    </NavLink>
                    <button className="ad-header__logout" onClick={logout}>
                        <FontAwesomeIcon icon={faRightFromBracket} />
                        <span>Logout</span>
                    </button>
                </div>
            </header>

            <div className="ad-body">
                {menuOpen && <div className="ad-backdrop" onClick={() => setMenu(false)} />}

                <aside className={`ad-sidebar ${menuOpen ? 'ad-sidebar--open' : ''}`}>
                    <SidebarBanner subtitle={roleLabel} />
                    <p className="ad-sidebar__label">Navigation</p>
                    <nav className="ad-nav">
                        {NAV.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                title={item.label}
                                className={({ isActive }) => `ad-nav__item ${isActive ? 'ad-nav__item--active' : ''}`}
                                onClick={() => setMenu(false)}
                            >
                                <FontAwesomeIcon icon={item.icon} className="ad-nav__icon" />
                                <span>{item.label}</span>
                                {item.badge && unread > 0 && <span className="pr-nav__count">{unread}</span>}
                            </NavLink>
                        ))}
                    </nav>
                </aside>

                <main className="ad-main">
                    {profile && profile.parish === null ? (
                        <div className="ad-empty-scope">
                            <FontAwesomeIcon icon={faShieldHalved} className="ad-empty-scope__icon" />
                            <h2>No parish assigned yet</h2>
                            <p>
                                Your calendar shows the Masses and celebrations of the parish you serve.
                                This account has not been assigned to a parish yet.
                            </p>
                            <p className="ad-empty-scope__hint">
                                Ask the SacraSched platform owner to assign you under <b>Platform Accounts</b>.
                            </p>
                        </div>
                    ) : (
                        <>
                            <h1 className="ad-page-title">{current?.label || 'My Calendar'}</h1>
                            <Outlet context={{ profile, unread, setUnread, refreshUnread }} />
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
