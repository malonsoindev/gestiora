import type { UserRepository } from '../domain/ports.ts';
import type { User } from '../domain/user.ts';
import { CliError } from '../domain/errors.ts';

/**
 * Busca usuarios cuyo email o nombre coincida con la cadena proporcionada.
 *
 * @param repo - Adaptador HTTP de usuarios.
 * @param query - Texto de búsqueda (no puede estar vacío).
 * @throws {CliError} Si la query está vacía.
 */
export async function findUsersUseCase(repo: UserRepository, query: string): Promise<User[]> {
  if (query.trim() === '') {
    throw new CliError('La búsqueda no puede estar vacía');
  }
  return repo.findUsers(query.trim());
}
