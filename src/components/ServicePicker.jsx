import useSiteContent from '../hooks/useSiteContent';
import ServiceCard from './ServiceCard';
import { SERVICES } from '../utils/services';

/**
 * The four services a signed-in devotee can request, as cards.
 * Picking one opens its booking wizard.
 */
export default function ServicePicker({ onPick, disabled = false, disabledHint }) {
    const { slots } = useSiteContent();

    return (
        <div className="bk-picker">
            {SERVICES.map((s, i) => (
                <ServiceCard
                    key={s.id}
                    service={s}
                    art={slots[s.slot]}
                    type="button"
                    // Staggered so the four cards arrive in sequence rather
                    // than snapping in together.
                    style={{ animationDelay: `${i * 55}ms` }}
                    onClick={() => onPick(s.id)}
                    disabled={disabled}
                    title={disabled ? disabledHint : undefined}
                />
            ))}
        </div>
    );
}
