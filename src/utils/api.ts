import { API_BASE_URL } from './constants';
import { getStoredToken, handleSessionExpired, shouldLogoutOnUnauthorized } from './session';

type RequestConfig = RequestInit & {
  params?: Record<string, string>;
};

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const { params, ...init } = config;
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = endpoint.replace(/^\//, '');
  const url = new URL(path ? `${base}/${path}` : base);
  if (params) {
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, value)
    );
  }
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), { ...init, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && shouldLogoutOnUnauthorized(endpoint)) {
      handleSessionExpired();
      throw new Error('Session expired');
    }
    throw new ApiError((data as { message?: string }).message ?? 'Request failed', res.status, data);
  }
  return data as T;
}

/**
 * Carries the HTTP status and parsed body alongside the message, so callers can react to a
 * specific failure (e.g. a 429 carrying `retryAfterSec`) rather than only showing its text.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** Seconds to wait before retrying, when the server sent a rate-limit response. */
export function getRetryAfterSec(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.status !== 429) return null;
  const sec = (error.data as { retryAfterSec?: number } | null)?.retryAfterSec;
  return typeof sec === 'number' && sec > 0 ? sec : null;
}

export async function get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
  return request<T>(endpoint, { ...config, method: 'GET' });
}

export async function post<T>(
  endpoint: string,
  body?: unknown,
  config?: RequestConfig
): Promise<T> {
  return request<T>(endpoint, { ...config, method: 'POST', body: body ? JSON.stringify(body) : undefined });
}

export async function put<T>(
  endpoint: string,
  body?: unknown,
  config?: RequestConfig
): Promise<T> {
  return request<T>(endpoint, { ...config, method: 'PUT', body: body ? JSON.stringify(body) : undefined });
}

export async function patch<T>(
  endpoint: string,
  body?: unknown,
  config?: RequestConfig
): Promise<T> {
  return request<T>(endpoint, { ...config, method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
}

export async function del<T>(endpoint: string, config?: RequestConfig): Promise<T> {
  return request<T>(endpoint, { ...config, method: 'DELETE' });
}
