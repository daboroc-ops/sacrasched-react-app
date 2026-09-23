import { NavLink, Outlet } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faScroll, faUserShield, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import useAuth from '../../hooks/useAuth';
import useLogout from '../../hooks/useLogout';

/* Two destinations, so they sit in the header rather than behind a drawer.
   Everything else about a parish — its website, appearance and offerings —
   is reached from that parish's own card on the overview, where the thing
   being changed is on screen next to the control that changes it. */
const NAV = [
    { to: '/superadmin/logs',     label: 'Audit log', icon: faScroll },
    { to: '/superadmin/accounts', label: 'Accounts',  icon: faUserShield },
];

/**
 * Shell for the platform-owner area.
 *
 * There is no link to the parish admin or the devotee view: this console is
 * the platform owner's, and hopping between roles from inside it blurred
 * which dashboard you were looking at. Reach the others by their own address.
 */
export default function SuperAdminLayout() {
    const { auth } = useAuth();
    const handleLogout = useLogout();

    const user = auth?.user;
    const name = user ? `${user.firstname} ${user.lastname}` : 'Super Admin';
    const initials = (user?.firstname?.[0] || 'S').toUpperCase();

    return (
        <div className="ad-shell sa-shell">

            <header className="ad-header sa-header">
                <NavLink to="/superadmin" className="sa-header__brand">
                    <img src="/favicon.svg" alt="" className="ad-header__mark" />
                    <span className="sa-header__name">SacraSched</span>
                    <span className="sa-header__pill">Platform</span>
                </NavLink>

                <nav className="sa-topnav">
                    {NAV.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `sa-topnav__item${isActive ? ' sa-topnav__item--active' : ''}`}
                        >
                            <FontAwesomeIcon icon={item.icon} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sa-header__end">
                    <span className="ad-header__user sa-header__user">
                        <span className="ad-header__avatar sa-header__avatar">{initials}</span>
                        {name}
                    </span>
                    <button className="ad-header__logout sa-header__logout" onClick={handleLogout}>
                        <FontAwesomeIcon icon={faRightFromBracket} />
                        <span>Logout</span>
                    </button>
                </div>
            </header>

            <main className="sa-main">
                <Outlet />
            </main>
        </div>
    );
}
