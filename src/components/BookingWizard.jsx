import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faChevronLeft, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import ParishBanner from './ParishBanner';

/**
 * The step-by-step chrome the four booking forms share — the same shape as
 * the register wizard: a progress bar, one question at a time, Back and Next.
 *
 * Each caller passes `steps`, where a step is:
 *   { title, sub, render: () => JSX, validate?: () => string | null }
 *
 * `validate` returns a message to block on, or null to let the step pass. It
 * runs on Next as well as on Submit, so a problem is caught on the step that
 * owns the field rather than at the end.
 *
 * `onSubmit` may resolve to a step number to send the visitor back to — the
 * date step, when the hour went to someone else while they were typing.
 */
export default function BookingWizard({
    title,
    steps,
    onSubmit,
    onExit,
    submitting = false,
    submitLabel = 'Submit request',
    banner = null,
    disabled = false,
    // Blocks the final submit only. A captcha that lives on the last step
    // must not disable Next on the steps before it — that locks the form
    // at step 1 with no way to reach the thing that would unlock it.
    submitDisabled = false,
    done = false,
    exitLabel = 'All services',
    className = '',
    // Once filed: whose church it went to, and the way back to the calendar
    parish = null,
    onCalendar,
}) {
    const [rawStep, setStep] = useState(0);
    const [err,     setErr]  = useState('');

    /* A form may add or drop a step as earlier answers change (a sacrament
       with extra details, say). Clamp rather than index past the end. */
    const step    = Math.min(rawStep, steps.length - 1);
    const isLast  = step === steps.length - 1;
    const current = steps[step];

    const next = async e => {
        e.preventDefault();
        const problem = current.validate?.();
        if (problem) return setErr(problem);
        setErr('');
        if (!isLast) return setStep(step + 1);
        const goTo = await onSubmit();
        if (Number.isInteger(goTo)) setStep(goTo);
    };

    const back = () => {
        setErr('');
        setStep(step - 1);
    };

    /* Once it is filed there is nothing left to step through, and leaving the
       submit button live on an emptied form invites a second, blank request. */
    if (done) return (
        <div className={`bk-wiz bk-wiz--done ${className}`}>
            {(title || onExit) && (
                <header className="bk-wiz__top">
                    {onExit && (
                        <button type="button" className="bk-wiz__exit" onClick={onExit}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                            <span>{exitLabel}</span>
                        </button>
                    )}
                    {title && <h3 className="bk-wiz__service">{title}</h3>}
                </header>
            )}

            <ParishBanner parish={parish} />

            {banner}

            <div className="bk-wiz__after">
                {onCalendar && (
                    <button type="button" className="btn btn--primary bk-wiz__again" onClick={onCalendar}>
                        <FontAwesomeIcon icon={faCalendarDays} /> Back to Calendar
                    </button>
                )}
                {onExit && (
                    <button type="button" className={`btn ${onCalendar ? 'btn--ghost' : 'btn--primary'} bk-wiz__again`} onClick={onExit}>
                        Book another service
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <form className={`bk-wiz ${className}`} onSubmit={next}>
            {(title || onExit) && (
                <header className="bk-wiz__top">
                    {onExit && (
                        <button type="button" className="bk-wiz__exit" onClick={onExit}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                            <span>{exitLabel}</span>
                        </button>
                    )}
                    {title && <h3 className="bk-wiz__service">{title}</h3>}
                </header>
            )}

            {banner}

            <div className="bk-prog" aria-hidden="true">
                {steps.map((s, i) => (
                    <span key={s.title} className={`bk-prog__bar${i <= step ? ' bk-prog__bar--done' : ''}`} />
                ))}
            </div>
            <p className="bk-prog__count">Step {step + 1} of {steps.length}</p>

            {/* Keyed on the step so each one animates in as it arrives. */}
            <div className="bk-step" key={step}>
                <div className="bk-step__head">
                    <h4 className="bk-step__title">{current.title}</h4>
                    {current.sub && <p className="bk-step__sub">{current.sub}</p>}
                </div>

                {err && <div className="form-alert form-alert--error">{err}</div>}

                <div className="form-grid">{current.render()}</div>
            </div>

            <div className="bk-wiz__actions">
                {step > 0 ? (
                    <button type="button" className="bk-wiz__back" onClick={back}>
                        <FontAwesomeIcon icon={faChevronLeft} />
                        Back
                    </button>
                ) : <span />}
                <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={submitting || disabled || (isLast && submitDisabled)}
                >
                    {submitting ? 'Submitting…' : isLast ? submitLabel : 'Next'}
                </button>
            </div>
        </form>
    );
}
