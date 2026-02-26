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

export interface SignUpCredentials {
  fullName: string;
  email: string;
  password: string;
}
