import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { changePassword as changePasswordRequest, login as loginRequest, logout as logoutRequest, refreshSession as refreshSessionRequest, register as registerRequest, updateProfile as updateProfileRequest } from '@/services/auth';
import type { AuthSession, ChangePasswordPayload, LoginPayload, RegisterPayload, UpdateProfilePayload, User } from '@/types/auth';
import { clearSession, getStoredToken, getStoredUser, hasAuthSessionCookie, saveSession } from '@/utils/storage';
import { IS_MOCK, MOCK_TOKEN, MOCK_USER } from '@/services/mock/mock-data';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  signIn: (payload: LoginPayload) => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  syncSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const applySession = useCallback((session: AuthSession) => {
    setUser(session.user);
    setToken(session.token);
    saveSession(session);
  }, []);

  const syncSession = useCallback(async () => {
    const storedUser = getStoredUser();
    const storedToken = getStoredToken();

    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
      return;
    }

    if (!hasAuthSessionCookie()) {
      clearSession();
      setUser(null);
      setToken(null);
      return;
    }

    try {
      const session = await refreshSessionRequest();
      applySession(session);
    } catch {
      clearSession();
      setUser(null);
      setToken(null);
    }
  }, [applySession]);

  useEffect(() => {
    (async () => {
      if (IS_MOCK) {
        // Auto-login in mock/demo mode — no backend needed
        setUser(MOCK_USER as unknown as User);
        setToken(MOCK_TOKEN);
        setIsBootstrapping(false);
        return;
      }
      await syncSession();
      setIsBootstrapping(false);
    })();
  }, [syncSession]);

  const signIn = useCallback(async (payload: LoginPayload) => {
    const session = await loginRequest(payload);
    applySession(session);
  }, [applySession]);

  const signUp = useCallback(async (payload: RegisterPayload) => {
    await registerRequest(payload);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
      setUser(null);
      setToken(null);
    }
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const updated = await updateProfileRequest(payload);
    if (token) {
      const nextSession = { token, user: updated };
      saveSession(nextSession);
    }
    setUser(updated);
    return updated;
  }, [token]);

  const changePassword = useCallback(async (payload: ChangePasswordPayload) => {
    await changePasswordRequest(payload);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isBootstrapping,
    signIn,
    signUp,
    signOut,
    updateProfile,
    changePassword,
    syncSession,
  }), [changePassword, isBootstrapping, signIn, signOut, signUp, syncSession, token, updateProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}