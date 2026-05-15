import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarDays, faChurch, faClipboardList, faFolderOpen,
    faCross, faBars, faRightFromBracket
} from '@fortawesome/free-solid-svg-icons';
import useAuth from '../hooks/useAuth';
import axiosPublic from '../api/axios';

import CalendarView     from '../components/CalendarView';
import MassScheduleView from '../components/MassScheduleView';
import BookServices     from '../components/BookServices';
import MyRequests       from '../components/MyRequests';

const NAV = [
    { id: 'calendar',  label: 'Calendar',      icon: faCalendarDays  },
    { id: 'schedule',  label: 'Mass Schedule',  icon: faChurch        },
    { id: 'book',      label: 'Book Services',  icon: faClipboardList },
    { id: 'requests',  label: 'My Requests',    icon: faFolderOpen    },
];

export default function Dashboard() {
    const { auth, setAuth } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('calendar');
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

    return (
        <div className="app-shell">
            {/* ── Sidebar ───────────────────────────────────── */}
            <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
                <div className="sidebar__logo">
                    <div className="sidebar__cross">
                        <FontAwesomeIcon icon={faCross} />
                    </div>
                    <span className="sidebar__name">SacraSched</span>
                </div>

                <nav className="sidebar__nav">
                    {NAV.map(item => (
                        <button
                            key={item.id}
                            className={`nav-item ${activeTab === item.id ? 'nav-item--active' : ''}`}
                            onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                        >
                            <FontAwesomeIcon icon={item.icon} className="nav-item__icon" />
                            <span className="nav-item__label">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="sidebar__footer">
                    <div className="sidebar__user">
                        <div className="sidebar__avatar">
                            {(user?.firstname?.[0] || 'U').toUpperCase()}
                        </div>
                        <div className="sidebar__user-info">
                            <span className="sidebar__user-name">{displayName}</span>
                            <span className="sidebar__user-role">Parishioner</span>
                        </div>
                    </div>
                    <button className="sidebar__logout" onClick={handleLogout} title="Logout">
                        <FontAwesomeIcon icon={faRightFromBracket} />
                    </button>
                </div>
            </aside>

            {/* Backdrop for mobile */}
            {sidebarOpen && (
                <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── Main ─────────────────────────────────────── */}
            <div className="app-main">
                <header className="app-header">
                    <button
                        className="header-menu-btn"
                        onClick={() => setSidebarOpen(o => !o)}
                    >
                        <FontAwesomeIcon icon={faBars} />
                    </button>
                    <h2 className="header-title">
                        {NAV.find(n => n.id === activeTab)?.label}
                    </h2>
                    <button className="header-logout-btn" onClick={handleLogout}>
                        Sign out
                    </button>
                </header>

                <main className="app-content">
                    {activeTab === 'calendar' && <CalendarView />}
                    {activeTab === 'schedule' && <MassScheduleView />}
                    {activeTab === 'book'     && <BookServices />}
                    {activeTab === 'requests' && <MyRequests />}
                </main>
            </div>
        </div>
    );
}
