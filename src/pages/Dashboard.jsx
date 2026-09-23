import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarDays, faChurch, faClipboardList, faFolderOpen,
    faBars, faCircleUser, faRightFromBracket
} from '@fortawesome/free-solid-svg-icons';
import useAuth from '../hooks/useAuth';
import axiosPublic from '../api/axios';

import CalendarView     from '../components/CalendarView';
import MassScheduleView from '../components/MassScheduleView';
import BookServices     from '../components/BookServices';
import MyRequests       from '../components/MyRequests';
import ProfileView      from '../components/ProfileView';

const NAV = [
    { id: 'calendar',  label: 'Calendar',       icon: faCalendarDays  },
    { id: 'schedule',  label: 'Mass Schedules',  icon: faChurch        },
    { id: 'book',      label: 'Book Services',   icon: faClipboardList },
    { id: 'requests',  label: 'My Request',      icon: faFolderOpen    },
    { id: 'profile',   label: 'Profile',         icon: faCircleUser    },
];

export default function Dashboard() {
    const { auth, setAuth } = useAuth();
    const navigate = useNavigate();
    const [activeTab,   setActiveTab]   = useState('calendar');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        try { await axiosPublic.get('/logout'); } catch (_) { /* ignore */ }
        setAuth({});
        navigate('/login', { replace: true });
    };

    const user = auth?.user;
    const displayName = user
        ? `${user.firstname} ${user.lastname}`
        : (auth?.username || 'User');
    const initials = (user?.firstname?.[0] || 'U').toUpperCase();

    return (
        <div className="app-shell">

            {/* ── Sidebar overlay ──────────────────────────── */}
            {sidebarOpen && (
                <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
            )}

            <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>

                {/* Brand card — white pill at top */}
                <div className="sidebar__brand-card">
                    <img src="/favicon.svg" alt="SacraSched" className="sidebar__brand-icon" />
                    <div className="sidebar__brand-text">
                        <img src="/sacrasched-wordmark.svg" alt="SacraSched" className="sidebar__brand-wordmark" />
                        <span className="sidebar__brand-sub">Devotee</span>
                    </div>
                </div>

                {/* User info */}
                <div className="sidebar__user">
                    <div className="sidebar__avatar">{initials}</div>
                    <div className="sidebar__user-info">
                        <span className="sidebar__user-name">{displayName}</span>
                        <span className="sidebar__user-role">User</span>
                    </div>
                </div>

                {/* Nav pills */}
                <nav className="sidebar__nav">
                    {NAV.map(item => (
                        <button
                            key={item.id}
                            className={`nav-pill ${activeTab === item.id ? 'nav-pill--active' : ''}`}
                            onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                        >
                            <FontAwesomeIcon icon={item.icon} className="nav-pill__icon" />
                            <span className="nav-pill__label">{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Sign out at bottom */}
                <button className="sidebar__signout" onClick={handleLogout}>
                    <FontAwesomeIcon icon={faRightFromBracket} />
                    <span>Sign out</span>
                </button>

            </aside>

            {/* ── Main ─────────────────────────────────────── */}
            <div className="app-main">

                {/* Header */}
                <header className="app-header">
                    <button
                        className="header-menu-btn"
                        onClick={() => setSidebarOpen(o => !o)}
                    >
                        <FontAwesomeIcon icon={faBars} />
                    </button>

                    {/* Mobile: centered wordmark / Desktop: page title */}
                    <img
                        src="/sacrasched-wordmark.svg"
                        alt="SacraSched"
                        className="header-wordmark"
                    />
                    <h2 className="header-title">
                        {NAV.find(n => n.id === activeTab)?.label}
                    </h2>

                    <button className="header-logout-btn" onClick={handleLogout}>
                        Sign out
                    </button>
                </header>

                {/* ── Icon tab row — mobile only ────────────── */}
                <nav className="mobile-tab-bar">
                    {NAV.map(item => (
                        <button
                            key={item.id}
                            className={`mobile-tab${activeTab === item.id ? ' mobile-tab--active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <FontAwesomeIcon icon={item.icon} className="mobile-tab__icon" />
                        </button>
                    ))}
                </nav>

                <main className="app-content">
                    {activeTab === 'calendar'  && <CalendarView />}
                    {activeTab === 'schedule'  && <MassScheduleView />}
                    {activeTab === 'book'      && <BookServices />}
                    {activeTab === 'requests'  && <MyRequests />}
                    {activeTab === 'profile'   && <ProfileView />}
                </main>
            </div>
        </div>
    );
}
