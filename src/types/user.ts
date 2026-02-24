export interface UserRecord {
  _id: string;
  fullName: string;
  email: string;
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
}
