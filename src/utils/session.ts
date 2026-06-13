import { API_BASE_URL } from './constants';

const TOKEN_KEY = 'token';

/** Login/signup endpoints that may return 401 without meaning the CRM session expired. */
const PUBLIC_AUTH_PATHS = new Set(['auth/login', 'auth/login-otp', 'auth/signup']);

let handlingExpiry = false;

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function normalizePath(endpointOrUrl: string): string {
  try {
    const url = endpointOrUrl.startsWith('http')
      ? new URL(endpointOrUrl)
      : new URL(endpointOrUrl.replace(/^\//, ''), 'http://local');
    return url.pathname.replace(/^\/api\/?/, '').replace(/^\//, '').toLowerCase();
  } catch {
    return endpointOrUrl.replace(/^\//, '').split('?')[0].toLowerCase();
  }
}

export function shouldLogoutOnUnauthorized(endpointOrUrl: string): boolean {
  if (!getStoredToken()) return false;
  const path = normalizePath(endpointOrUrl);
  return !PUBLIC_AUTH_PATHS.has(path);
}

export function handleSessionExpired(): void {
  if (handlingExpiry) return;
  if (!getStoredToken()) return;
  handlingExpiry = true;
  clearStoredToken();
  window.location.assign('/');
}

export function setupFetchInterceptor(): void {
  const apiBase = API_BASE_URL.replace(/\/$/, '');
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const res = await originalFetch(input, init);
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (
      res.status === 401 &&
      (url.startsWith(apiBase) || url.includes('/api/')) &&
      shouldLogoutOnUnauthorized(url)
    ) {
      handleSessionExpired();
    }

    return res;
  };
}
