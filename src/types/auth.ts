export interface AuthUser {
  id: string;
  fullName?: string;
  email: string;
  role?: string;
  /** Module ids this role can access (from API). When present, used for nav/route access. */
  roleModules?: string[];
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RequestOtpPayload {
  phone: string;
}

export interface RequestOtpResponse {
  message: string;
  expiresAt?: string;
  expiryMinutes?: number;
  /** Set when the server has no SMS provider configured (non-production only). */
  devMode?: boolean;
}

export interface LoginWithOtpPayload {
  phone: string;
  otp: string;
}

export interface SignUpCredentials {
  fullName: string;
  email: string;
  password: string;
}
