import type { UserRepository } from '../domain/ports.ts';
import { CliError } from '../domain/errors.ts';

export async function resetPasswordUseCase(
  repo: UserRepository,
  id: string,
  password: string,
  confirmPassword: string,
): Promise<void> {
  if (!id.trim()) {
    throw new CliError('El ID del usuario no puede estar vacío.');
  }

  if (!password) {
    throw new CliError('La contraseña no puede estar vacía.');
  }

  if (password !== confirmPassword) {
    throw new CliError('Las contraseñas no coinciden.');
  }

  await repo.resetPassword(id, { newPassword: password });

  // TODO: deuda técnica — la revocación debería ocurrir en el backend
  // dentro de ChangeUserPasswordUseCase, igual que en SoftDeleteUserUseCase.
  await repo.revokeUserSessions(id);
}
