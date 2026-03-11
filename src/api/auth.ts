import { useMutation, useQuery } from '@tanstack/react-query';
import { get, post } from '../utils/api';
import type {
  AuthResponse,
  AuthUser,
  LoginCredentials,
  LoginWithOtpPayload,
  RequestOtpPayload,
  SignUpCredentials,
} from '../types/auth';

const AUTH_BASE = '/auth';

export interface MeResponse {
  user: AuthUser;
}

export function getMeApi() {
  return get<MeResponse>(`${AUTH_BASE}/me`);
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMeApi,
  });
}

export function loginApi(credentials: LoginCredentials) {
  return post<AuthResponse>(`${AUTH_BASE}/login`, credentials);
}

export function requestOtpApi(payload: RequestOtpPayload) {
  return post<{ message: string }>(`${AUTH_BASE}/request-otp`, payload);
}

export function loginWithOtpApi(payload: LoginWithOtpPayload) {
  return post<AuthResponse>(`${AUTH_BASE}/login-otp`, payload);
}

export function signUpApi(credentials: SignUpCredentials) {
  return post<AuthResponse>(`${AUTH_BASE}/signup`, credentials);
}

const TOKEN_KEY = 'token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      setStoredToken(data.token);
    },
  });
}

export function useRequestOtpMutation() {
  return useMutation({ mutationFn: requestOtpApi });
}

export function useLoginWithOtpMutation() {
  return useMutation({
    mutationFn: loginWithOtpApi,
    onSuccess: (data) => {
      setStoredToken(data.token);
    },
  });
}

export function useSignUpMutation() {
  return useMutation({
    mutationFn: signUpApi,
    onSuccess: (data) => {
      setStoredToken(data.token);
    },
  });
}
