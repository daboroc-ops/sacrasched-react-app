import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTableColumns, faHandsPraying, faCalendarDays, faChurch, faClipboardList,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Miniature of each template, built from the same tokens the real views use.
 * It sits inside an element whose inline style carries the edited tokens, so
 * it re-colours live without touching the surrounding console.
 */
export function ThemePreview({ variant = 'admin' }) {
    if (variant === 'devotee') {
        return (
            <div className="tp tp--devotee">
                <aside className="tp__sidebar">
                    <div className="tp__brandcard">
                        <span className="tp__mark" />
                        <span className="tp__brandtext" />
                    </div>
                    <span className="tp__pill tp__pill--active">
                        <FontAwesomeIcon icon={faCalendarDays} /> Calendar
                    </span>
                    <span className="tp__pill">
                        <FontAwesomeIcon icon={faChurch} /> Mass Schedules
                    </span>
                    <span className="tp__pill">
                        <FontAwesomeIcon icon={faClipboardList} /> Book Services
                    </span>
                </aside>

                <div className="tp__body">
                    <div className="tp__topbar"><span className="tp__title">Book Services</span></div>
                    <div className="tp__panel">
                        <div className="tp__tabs">
                            <span className="tp__tab tp__tab--active">Blessing</span>
                            <span className="tp__tab">Sacrament</span>
                        </div>
                        <div className="tp__field" />
                        <div className="tp__field tp__field--short" />
                        <div className="tp__row">
                            <span className="tp__btn tp__btn--filled">Submit request</span>
                            <span className="tp__btn tp__btn--outline">Cancel</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="tp tp--admin">
            <div className="tp__header">
                <span className="tp__mark" />
                <span className="tp__brandtext" />
                <span className="tp__rolepill">Admin</span>
            </div>

            <div className="tp__split">
                <aside className="tp__nav">
                    <span className="tp__navitem tp__navitem--active">
                        <FontAwesomeIcon icon={faTableColumns} /> Dashboard
                    </span>
                    <span className="tp__navitem">
                        <FontAwesomeIcon icon={faHandsPraying} /> Blessings
                    </span>
                    <span className="tp__navitem">
                        <FontAwesomeIcon icon={faCalendarDays} /> Calendar
                    </span>
                </aside>

                <div className="tp__body">
                    <div className="tp__welcome">
                        <span className="tp__welcome-title">Welcome back</span>
                        <span className="tp__welcome-chip">3 pending</span>
                    </div>

                    <div className="tp__stats">
                        {['Sacraments', 'Blessings', 'Documents'].map(label => (
                            <div className="tp__stat" key={label}>
                                <span className="tp__stat-label">{label}</span>
                                <span className="tp__stat-value">12</span>
                            </div>
                        ))}
                    </div>

                    <div className="tp__panel">
                        <div className="tp__tablerow tp__tablerow--head">
                            <span>Requestor</span><span>Status</span>
                        </div>
                        <div className="tp__tablerow">
                            <span>Juan Dela Cruz</span>
                            <span className="tp__badge tp__badge--ok">approved</span>
                        </div>
                        <div className="tp__tablerow">
                            <span>Maria Santos</span>
                            <span className="tp__badge tp__badge--warn">pending</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
