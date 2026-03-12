/** Roles disponibles en el sistema Gestiora. */
export type UserRole = 'Usuario' | 'Administrador';

/** Estado del ciclo de vida de un usuario. */
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';

/** Representación de un usuario del sistema devuelta por la API. */
export interface User {
  userId: string;
  email: string;
  name?: string;
  avatar?: string;
  roles: UserRole[];
  status: UserStatus;
  createdAt: string;
}

/** Credenciales para el inicio de sesión. */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Respuesta de autenticación con el token de acceso JWT. */
export interface AuthResponse {
  accessToken: string;
}

/** Campos editables del perfil de un usuario. Todos son opcionales. */
export interface UpdateUserPayload {
  name?: string;
  avatar?: string;
  roles?: UserRole[];
  status?: UserStatus;
}

/** Payload para restablecer la contraseña de un usuario. */
export interface ResetPasswordPayload {
  newPassword: string;
}

/** Datos necesarios para crear un nuevo usuario. */
export interface CreateUserPayload {
  email: string;
  password: string;
  name?: string;
  roles: UserRole[];
}

/** Resultado devuelto tras crear un usuario (contiene el ID asignado). */
export interface CreateUserResult {
  userId: string;
}
