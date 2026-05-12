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
