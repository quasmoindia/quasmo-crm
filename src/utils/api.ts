import { API_BASE_URL } from './constants';

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
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), { ...init, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? 'Request failed');
  }
  return data as T;
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
