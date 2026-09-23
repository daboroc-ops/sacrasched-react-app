import useAuth from '../../hooks/useAuth';

/**
 * Who is booking. The forms no longer ask — the person is signed in, so their
 * name, email and number come from the account.
 *
 * The one exception is the contact number. It is optional on a User but
 * REQUIRED by every request model, so an account created without one would
 * fail server-side validation with no field on screen to fix it. When it is
 * missing the form asks for that single field; when it is present it asks for
 * nothing.
 */
export default function useRequestor() {
    const { auth } = useAuth();
    const user = auth?.user;

    const requestor = {
        requestorName: user ? `${user.firstname} ${user.lastname}`.trim() : '',
        email:         user?.email         || '',
        contactNumber: user?.contactNumber || '',
    };

    return { requestor, needsContact: !requestor.contactNumber };
}
