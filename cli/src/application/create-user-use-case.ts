import type { UserRepository } from '../domain/ports.ts';
import type { CreateUserPayload, CreateUserResult } from '../domain/user.ts';
import { CliError } from '../domain/errors.ts';

/**
 * Crea un nuevo usuario en el sistema.
 * Valida que email, contraseña y roles no estén vacíos antes de la petición.
 *
 * @param repo - Adaptador HTTP de usuarios.
 * @param payload - Datos del nuevo usuario (email, contraseña, nombre y roles).
 * @returns El ID asignado al usuario creado.
 * @throws {CliError} Si el email, la contraseña o los roles están vacíos.
 */
export async function createUserUseCase(
  repo: UserRepository,
  payload: CreateUserPayload,
): Promise<CreateUserResult> {
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
