import { useMutation, useQuery } from '@tanstack/react-query';
import { get, post } from '../utils/api';
import { getStoredToken, setStoredToken } from '../utils/session';
import type {
  AuthResponse,
  AuthUser,
  LoginCredentials,
  LoginWithOtpPayload,
  RequestOtpPayload,
  RequestOtpResponse,
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
    enabled: !!getStoredToken(),
    retry: false,
  });
}

export function loginApi(credentials: LoginCredentials) {
  return post<AuthResponse>(`${AUTH_BASE}/login`, credentials);
}

export function requestOtpApi(payload: RequestOtpPayload) {
  return post<RequestOtpResponse>(`${AUTH_BASE}/request-otp`, payload);
}

export function loginWithOtpApi(payload: LoginWithOtpPayload) {
  return post<AuthResponse>(`${AUTH_BASE}/login-otp`, payload);
}

export function signUpApi(credentials: SignUpCredentials) {
  return post<AuthResponse>(`${AUTH_BASE}/signup`, credentials);
}

export { getStoredToken, setStoredToken, clearStoredToken } from '../utils/session';

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
