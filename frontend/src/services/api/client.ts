import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import { clearSession, getStoredToken, saveSession } from '@/utils/storage';
import type { ApiResponse } from '@/types/api';
import type { AuthSession } from '@/types/auth';

interface ApiRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  _retry?: boolean;
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<AuthSession> | null = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = api
      .post<ApiResponse<{ token: string; user: AuthSession['user'] }>>('/auth/refresh-token', {}, { skipAuth: true } as ApiRequestConfig)
      .then((response) => {
        const refreshed = {
          token: response.data.data.token,
          user: response.data.data.user,
        };
        saveSession(refreshed);
        return refreshed;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const requestConfig = config as ApiRequestConfig;
  if (!requestConfig.skipAuth) {
    const token = getStoredToken();
    if (token) {
      requestConfig.headers = requestConfig.headers ?? {};
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return requestConfig as any;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as ApiRequestConfig | undefined;
    const shouldRetry = error.response?.status === 401 && originalRequest && !originalRequest.skipAuth && !originalRequest._retry;

    if (shouldRetry) {
      originalRequest._retry = true;
      try {
        const session = await refreshSession();
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${session.token}`;
        return api.request(originalRequest);
      } catch {
        clearSession();
      }
    }

    return Promise.reject(error);
  }
);

export async function request<T>(config: ApiRequestConfig) {
  const response = await api.request<ApiResponse<T>>(config);
  if (!response.data.success) {
    throw new Error(response.data.error || response.data.message || 'Yêu cầu thất bại');
  }
  return response.data;
}

export { api };