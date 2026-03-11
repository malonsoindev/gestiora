import type { UserRepository } from '../domain/ports.ts';
import type { User } from '../domain/user.ts';

export async function listUsersUseCase(repo: UserRepository): Promise<User[]> {
  const users = await repo.listUsers();
  return users.slice().sort((a, b) => a.email.localeCompare(b.email));
}
