import type { UserRepository } from '../domain/ports.ts';
import type { CreateUserPayload, User } from '../domain/user.ts';
import { CliError } from '../domain/errors.ts';

export async function createUserUseCase(
  repo: UserRepository,
  payload: CreateUserPayload,
): Promise<User> {
  if (!payload.email.trim()) {
    throw new CliError('El email no puede estar vacío.');
  }
  if (!payload.password.trim()) {
    throw new CliError('La contraseña no puede estar vacía.');
  }
  if (payload.roles.length === 0) {
    throw new CliError('Debe asignarse al menos un rol.');
  }

  return repo.createUser(payload);
}
