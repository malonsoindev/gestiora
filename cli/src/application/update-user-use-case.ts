import type { UserRepository } from '../domain/ports.ts';
import type { User, UpdateUserPayload } from '../domain/user.ts';
import { CliError } from '../domain/errors.ts';

/**
 * Actualiza los campos del perfil de un usuario.
 *
 * @param repo - Adaptador HTTP de usuarios.
 * @param id - ID del usuario a actualizar.
 * @param payload - Campos a modificar (al menos uno obligatorio).
 * @throws {CliError} Si el ID está vacío o el payload no contiene campos.
 * @throws {NotFoundError} Si el usuario no existe.
 */
export async function updateUserUseCase(
  repo: UserRepository,
  id: string,
  payload: UpdateUserPayload,
): Promise<User> {
  if (!id.trim()) {
    throw new CliError('El ID del usuario no puede estar vacío.');
  }

  if (Object.keys(payload).length === 0) {
    throw new CliError('Debes proporcionar al menos un campo para actualizar.');
  }

  return repo.updateUser(id, payload);
}
