export interface UserRecord {
  _id: string;
  fullName: string;
  email: string;
  role?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsersListResponse {
  data: UserRecord[];
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  role?: string;
  phone?: string;
}

export interface RoleOption {
  id: string;
  label: string;
  moduleIds: string[];
}

export interface RolesConfigResponse {
  roles: RoleOption[];
  modules: { id: string; label: string }[];
}

export interface UpdateUserPayload {
  fullName?: string;
  role?: string;
  phone?: string;
}
