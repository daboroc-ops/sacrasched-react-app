/** The validate() every "when" step shares — see components/forms/WhenFields. */
export function whenProblem(form, avail) {
    if (!form.preferredDate) return 'Choose a date.';
    if (avail.loading)       return 'The available times are still loading.';
    if (!avail.ok)           return avail.reason || 'That day is not available.';
    if (!form.preferredTime) return 'Choose a time.';
    return null;
}
