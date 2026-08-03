import { callBackend } from './api';

export function getStoredUserEmail() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')?.email || '';
  } catch (error) {
    return '';
  }
}

export async function loadUserApplications(email) {
  if (!email) {
    return [];
  }

  const applications = await callBackend(`/my_applications?email=${encodeURIComponent(email)}`);
  return Array.isArray(applications) ? applications : [];
}
