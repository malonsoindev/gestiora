import type { UserRepository } from '../domain/ports.ts';
import type { User } from '../domain/user.ts';
import { CliError } from '../domain/errors.ts';

export async function findUsersUseCase(repo: UserRepository, query: string): Promise<User[]> {
  if (query.trim() === '') {
    throw new CliError('La búsqueda no puede estar vacía');
  }
  return repo.findUsers(query.trim());
}
