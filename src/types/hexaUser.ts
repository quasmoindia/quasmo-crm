export interface HexaUserRecord {
  _id: string;
  fullName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface HexaUsersListResponse {
  data: HexaUserRecord[];
}

export interface CreateHexaUserPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface UpdateHexaUserPayload {
  fullName: string;
  email: string;
  /** If set and non-empty, replaces the password */
  password?: string;
}
