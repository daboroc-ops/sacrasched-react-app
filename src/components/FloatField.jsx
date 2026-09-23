import { forwardRef, useId } from 'react';

/**
 * Text input whose label starts inside the field and lifts onto the border
 * once the field is focused or filled — so an empty form reads as a list of
 * questions, and a filled one still says what each answer was.
 *
 * The animation is pure CSS: :placeholder-shown tells the label whether the
 * input is empty, so nothing here tracks focus or value in state. That means
 * it works with autofill, which fires no React events.
 *
 * The `placeholder` is the example ("juandelacruz"); it stays invisible until
 * the field has focus, otherwise it would sit under the resting label.
 */
const FloatField = forwardRef(function FloatField(
    { label, hint, className = '', ...input }, ref
) {
    const id = useId();

    return (
        <div className={`ff ${className}`.trim()}>
            <div className="ff__box">
                {/* Input first: the label is positioned with a sibling selector */}
                <input
                    {...input}
                    id={id}
                    ref={ref}
                    className="auth-input ff__input"
                />
                <label htmlFor={id} className="ff__label">{label}</label>
            </div>

            {hint && <p className="ff__hint">{hint}</p>}
        </div>
    );
});

export default FloatField;
