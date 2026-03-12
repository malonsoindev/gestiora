import type { UserRepository } from '../domain/ports.ts';
import type { User } from '../domain/user.ts';

/**
 * Obtiene todos los usuarios del sistema ordenados alfabéticamente por email.
 *
 * @param repo - Adaptador HTTP de usuarios.
 * @returns Lista de usuarios ordenada por email.
 * @throws {AuthError} Si el token ha expirado.
 */
export async function listUsersUseCase(repo: UserRepository): Promise<User[]> {
  const users = await repo.listUsers();
  return users.slice().sort((a, b) => a.email.localeCompare(b.email));
}
