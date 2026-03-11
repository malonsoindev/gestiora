import type { UserRepository } from '../domain/ports.ts';
import type { User, UpdateUserPayload } from '../domain/user.ts';
import { CliError } from '../domain/errors.ts';

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
