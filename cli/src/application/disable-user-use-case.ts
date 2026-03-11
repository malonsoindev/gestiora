import type { UserRepository } from '../domain/ports.ts';
import { CliError } from '../domain/errors.ts';

export async function disableUserUseCase(
  repo: UserRepository,
  id: string,
): Promise<void> {
  if (!id.trim()) {
    throw new CliError('El ID del usuario no puede estar vacío.');
  }

  await repo.disableUser(id);

  // TODO: deuda técnica — la revocación debería ocurrir en el backend
  // dentro de UpdateUserStatusUseCase, igual que en SoftDeleteUserUseCase.
  await repo.revokeUserSessions(id);
}
