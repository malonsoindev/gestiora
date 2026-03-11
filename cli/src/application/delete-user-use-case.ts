import type { UserRepository } from '../domain/ports.ts';
import { CliError } from '../domain/errors.ts';

export async function deleteUserUseCase(
  repo: UserRepository,
  id: string,
): Promise<void> {
  if (!id.trim()) {
    throw new CliError('El ID del usuario no puede estar vacío.');
  }

  await repo.deleteUser(id);
}
