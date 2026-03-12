/**
 * Puerto principal de la CLI. Define las operaciones de usuario
 * que debe implementar cualquier adaptador (HTTP, mock, etc.).
 *
 * Cada método puede lanzar:
 * - {@link import('./errors.ts').AuthError} si el token es inválido o ha expirado.
 * - {@link import('./errors.ts').CliError} ante cualquier error inesperado del servidor.
 */
export interface UserRepository {
  /** Autentica al usuario y devuelve el JWT de acceso. */
  login(email: string, password: string): Promise<string>;

  /** Devuelve todos los usuarios del sistema. */
  listUsers(): Promise<import('./user.ts').User[]>;

  /**
   * Busca usuarios cuyo email o nombre coincida con {@link query}.
   * @throws {CliError} Si la query está vacía (validado por el caso de uso).
   */
  findUsers(query: string): Promise<import('./user.ts').User[]>;

  /**
   * Actualiza los datos de un usuario.
   * @throws {NotFoundError} Si el usuario no existe.
   */
  updateUser(id: string, payload: import('./user.ts').UpdateUserPayload): Promise<import('./user.ts').User>;

  /**
   * Desactiva un usuario (status → INACTIVE).
   * @throws {NotFoundError} Si el usuario no existe.
   */
  disableUser(id: string): Promise<void>;

  /**
   * Restablece la contraseña de un usuario.
   * @throws {NotFoundError} Si el usuario no existe.
   */
  resetPassword(id: string, payload: import('./user.ts').ResetPasswordPayload): Promise<void>;

  /**
   * Revoca todas las sesiones activas de un usuario.
   * @throws {NotFoundError} Si el usuario no existe.
   */
  revokeUserSessions(id: string): Promise<void>;

  /** Crea un nuevo usuario y devuelve el ID asignado. */
  createUser(payload: import('./user.ts').CreateUserPayload): Promise<import('./user.ts').CreateUserResult>;

  /**
   * Elimina un usuario (borrado lógico).
   * @throws {NotFoundError} Si el usuario no existe.
   */
  deleteUser(id: string): Promise<void>;
}
