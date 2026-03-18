import type { UserRepository } from '../domain/ports.ts';
import { CliError } from '../domain/errors.ts';

/**
 * Elimina un usuario del sistema (borrado lógico).
 *
 * @param repo - Adaptador HTTP de usuarios.
 * @param id - ID del usuario a eliminar.
 * @throws {CliError} Si el ID está vacío.
 * @throws {NotFoundError} Si el usuario no existe.
 */
export async function deleteUserUseCase(
  repo: UserRepository,
  id: string,
): Promise<void> {
  if (!id.trim()) {
    throw new CliError('El ID del usuario no puede estar vacío.');
  }

  await repo.deleteUser(id);
}
