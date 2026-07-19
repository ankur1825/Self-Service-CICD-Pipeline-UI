export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export function userRoles(user) {
  return Array.isArray(user?.roles) ? user.roles : [];
}

export function isPlatformAdmin(user) {
  return userRoles(user).includes('platform-admin');
}

const CLOUD_MIGRATION_READ_ROLES = [
  'platform-admin',
  'migration-architect',
  'migration-operator',
  'migration-approver',
  'migration-auditor',
];

export function hasAnyRole(user, expectedRoles) {
  const roles = new Set(userRoles(user));
  return expectedRoles.some((role) => roles.has(role));
}

export function canAccessCloudMigration(user) {
  return hasAnyRole(user, CLOUD_MIGRATION_READ_ROLES);
}

export function canAuthorCloudMigration(user) {
  return hasAnyRole(user, ['platform-admin', 'migration-architect', 'migration-operator']);
}

export function canApproveCloudMigration(user) {
  return hasAnyRole(user, ['platform-admin', 'migration-approver']);
}
