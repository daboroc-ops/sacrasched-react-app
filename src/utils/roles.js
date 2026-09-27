/**
 * Role codes — must stay in sync with the backend's auth/roles_list.js.
 * The login / refresh responses return a flat array of these codes,
 * e.g. an admin is [2001, 1984, 5150] and a superadmin also carries 9999.
 * A priest is [2001, 3030] — created by the superadmin, never signed up.
 */
export const ROLES = {
    SuperAdmin: 9999,
    Admin:      5150,
    Editor:     1984,
    Priest:     3030,
    User:       2001,
};

/** True when the token carries at least one of the given role codes. */
export const hasRole = (roles, ...allowed) =>
    Array.isArray(roles) && roles.some(r => allowed.includes(r));

export const isSuperAdmin = roles => hasRole(roles, ROLES.SuperAdmin);
export const isAdmin      = roles => hasRole(roles, ROLES.Admin);
export const isEditor     = roles => hasRole(roles, ROLES.Editor);
export const isPriest     = roles => hasRole(roles, ROLES.Priest);

/** Admins and editors both get the admin dashboard; editors see less of it. */
export const isStaff = roles => hasRole(roles, ROLES.Admin, ROLES.Editor);

/** Highest role held, for display. */
export const roleLabel = roles => {
    if (isSuperAdmin(roles)) return 'Super Admin';
    if (isAdmin(roles))      return 'Admin';
    if (isEditor(roles))     return 'Editor';
    if (isPriest(roles))     return 'Priest';
    return 'Devotee';
};

/** Where a freshly authenticated user belongs. */
export const homePathFor = roles => {
    if (isSuperAdmin(roles)) return '/superadmin';
    if (isStaff(roles))      return '/admin';
    if (isPriest(roles))     return '/priest';
    return '/dashboard';
};
