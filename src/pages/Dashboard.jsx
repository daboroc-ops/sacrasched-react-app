import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarDays, faChurch, faClipboardList, faFolderOpen,
    faCircleUser, faRightFromBracket, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import useAuth from '../hooks/useAuth';
import useParish, { usePageTitle } from '../hooks/useParish';
import useLogout from '../hooks/useLogout';

import DashboardBanner  from '../components/DashboardBanner';
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

/**
 * The devotee dashboard.
 *
 * There is no sidebar: a devotee has five places to go, which is few enough
 * that hiding them behind a drawer costs more than it saves. They sit in a
 * rail under the banner instead, all visible at once, and the page keeps its
 * full width for the calendar and the booking forms.
 */
export default function Dashboard() {
    const { auth, isStaff, isSuperAdmin } = useAuth();
    const { isTenant } = useParish();
    const [activeTab, setActiveTab] = useState('calendar');

    /* "Book now" on a calendar day lands on Book Services with that date
       already chosen. Reaching the tab any other way starts blank, so a date
       picked days ago does not quietly seed a later booking. */
    const [bookingDate, setBookingDate] = useState('');
    const goBook = date => { setBookingDate(date); setActiveTab('book'); };
    const goTab  = id => { if (id === 'book') setBookingDate(''); setActiveTab(id); };

    const pageLabel = NAV.find(n => n.id === activeTab)?.label;
    usePageTitle(pageLabel);

    const handleLogout = useLogout();

    const user = auth?.user;
    const displayName = user
        ? `${user.firstname} ${user.lastname}`
        : (auth?.username || 'User');
    const initials = (user?.firstname?.[0] || 'U').toUpperCase();

    return (
        <div className="dshell">

            <DashboardBanner
                page={pageLabel}
                role={isTenant ? 'Devotee' : 'Parish services'}
            />

            {/* ── Navigation rail ──────────────────────────────
                Tabs on the left, the account on the right. On a phone the
                labels drop away and the tabs scroll, keeping every
                destination one tap from every other. */}
            <nav className="drail">
                <div className="drail__tabs">
                    {NAV.map(item => (
                        <button
                            key={item.id}
                            type="button"
                            className={`drail__tab${activeTab === item.id ? ' drail__tab--active' : ''}`}
                            aria-current={activeTab === item.id ? 'page' : undefined}
                            onClick={() => goTab(item.id)}
                        >
                            <FontAwesomeIcon icon={item.icon} className="drail__icon" />
                            <span className="drail__label">{item.label}</span>
                        </button>
                    ))}
                </div>

                <div className="drail__account">
                    {/* Staff reach this page through "Devotee view"; without a
                        way back the only exit is the browser's back button. */}
                    {isStaff && !isSuperAdmin && (
                        <Link to="/admin" className="drail__back" title="Admin dashboard">
                            <FontAwesomeIcon icon={faArrowLeft} />
                            <span>Admin dashboard</span>
                        </Link>
                    )}

                    <span className="drail__who">
                        <span className="drail__avatar">{initials}</span>
                        <span className="drail__name">{displayName}</span>
                    </span>

                    <button
                        type="button"
                        className="drail__signout"
                        onClick={handleLogout}
                        title="Sign out"
                    >
                        <FontAwesomeIcon icon={faRightFromBracket} />
                        <span>Sign out</span>
                    </button>
                </div>
            </nav>

            <main className="dshell__content">
                {activeTab === 'calendar'  && <CalendarView onBook={goBook} />}
                {activeTab === 'schedule'  && <MassScheduleView />}
                {activeTab === 'book'      && <BookServices initialDate={bookingDate} onCalendar={() => setActiveTab('calendar')} />}
                {activeTab === 'requests'  && <MyRequests />}
                {activeTab === 'profile'   && <ProfileView />}
            </main>
        </div>
    );
}
