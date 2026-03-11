export type UserRole = 'Usuario' | 'Administrador';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';

export interface User {
  userId: string;
  email: string;
  name?: string;
  avatar?: string;
  roles: UserRole[];
  status: UserStatus;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
}

export interface UpdateUserPayload {
  name?: string;
  avatar?: string;
  roles?: UserRole[];
  status?: UserStatus;
}

export interface ResetPasswordPayload {
  newPassword: string;
}
