import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHandsPraying, faCross, faChurch, faFileLines
} from '@fortawesome/free-solid-svg-icons';
import BlessingForm       from './forms/BlessingForm';
import MassIntentionForm  from './forms/MassIntentionForm';
import SacramentForm      from './forms/SacramentForm';
import DocumentRequestForm from './forms/DocumentRequestForm';

const TABS = [
    { id: 'blessing',  label: 'Blessing',        icon: faHandsPraying },
    { id: 'intention', label: 'Mass Intention',   icon: faCross        },
    { id: 'sacrament', label: 'Sacrament',        icon: faChurch       },
    { id: 'document',  label: 'Document Request', icon: faFileLines    },
];

export default function BookServices() {
    const [active, setActive] = useState('blessing');

    return (
        <div>
            <p className="page-intro">
                Submit a request below. The parish office will review and confirm your booking.
            </p>

            {/* Sub-tab bar */}
            <div className="sub-tabs">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        className={`sub-tab ${active === t.id ? 'sub-tab--active' : ''}`}
                        onClick={() => setActive(t.id)}
                    >
                        <FontAwesomeIcon icon={t.icon} />
                        <span>{t.label}</span>
                    </button>
                ))}
            </div>

            <div className="book-panel">
                {active === 'blessing'  && <BlessingForm />}
                {active === 'intention' && <MassIntentionForm />}
                {active === 'sacrament' && <SacramentForm />}
                {active === 'document'  && <DocumentRequestForm />}
            </div>
        </div>
    );
}
