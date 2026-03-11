import type { UserRepository } from '../domain/ports.ts';
import { tokenStore } from '../core/token-store.ts';
import { ForbiddenError } from '../domain/errors.ts';

function getRolesFromToken(token: string): string[] {
  const part = token.split('.')[1];
  if (!part) return [];
  try {
    const json = Buffer.from(part, 'base64url').toString('utf-8');
    const payload = JSON.parse(json) as { roles?: unknown };
    return Array.isArray(payload.roles) ? (payload.roles as string[]) : [];
  } catch {
    return [];
  }
}

export async function loginUseCase(
  repo: UserRepository,
  email: string,
  password: string,
): Promise<void> {
  const token = await repo.login(email, password);

  if (!getRolesFromToken(token).includes('ADMIN')) {
    throw new ForbiddenError('Acceso denegado. Solo los administradores pueden usar esta aplicación.');
  }

  tokenStore.set(token);
}
