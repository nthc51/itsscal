import { STORAGE_KEYS } from './constants';
import type { AuthSession, User } from '@/types/auth';

export function getStoredToken() {
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEYS.token, session.token);
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
}

export function hasAuthSessionCookie() {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((cookie) => cookie.startsWith('auth_session='));
}