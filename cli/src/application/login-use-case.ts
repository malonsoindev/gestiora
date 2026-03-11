import type { UserRepository } from '../domain/ports.ts';
import { tokenStore } from '../core/token-store.ts';

export async function loginUseCase(
  repo: UserRepository,
  email: string,
  password: string,
): Promise<void> {
  const token = await repo.login(email, password);
  tokenStore.set(token);
}
