import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginUseCase } from '../../src/application/login-use-case.ts';
import { tokenStore } from '../../src/core/token-store.ts';
import type { UserRepository } from '../../src/domain/ports.ts';
import { AuthError, ForbiddenError } from '../../src/domain/errors.ts';

function makeToken(roles: string[]): string {
  const payload = Buffer.from(JSON.stringify({ sub: '1', roles })).toString('base64url');
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`;
}

const ADMIN_TOKEN = makeToken(['ADMIN']);
const USER_TOKEN = makeToken(['USER']);

const mockRepo: UserRepository = {
  login: vi.fn(),
  listUsers: vi.fn(),
  findUsers: vi.fn(),
  updateUser: vi.fn(),
  disableUser: vi.fn(),
  resetPassword: vi.fn(),
  revokeUserSessions: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  tokenStore.clear();
});

describe('loginUseCase', () => {
  it('almacena el token en memoria cuando las credenciales son correctas y el usuario es ADMIN', async () => {
    vi.mocked(mockRepo.login).mockResolvedValue(ADMIN_TOKEN);

    await loginUseCase(mockRepo, 'admin@example.com', 'AdminPass1!a');

    expect(mockRepo.login).toHaveBeenCalledWith('admin@example.com', 'AdminPass1!a');
    expect(tokenStore.get()).toBe(ADMIN_TOKEN);
  });

  it('lanza ForbiddenError si el usuario no tiene rol ADMIN', async () => {
    vi.mocked(mockRepo.login).mockResolvedValue(USER_TOKEN);

    await expect(
      loginUseCase(mockRepo, 'user@example.com', 'UserPass1!a'),
    ).rejects.toThrow(ForbiddenError);

    expect(tokenStore.get()).toBeNull();
  });

  it('lanza AuthError si el repositorio rechaza las credenciales', async () => {
    vi.mocked(mockRepo.login).mockRejectedValue(new AuthError('Credenciales inválidas'));

    await expect(
      loginUseCase(mockRepo, 'admin@example.com', 'wrong-password'),
    ).rejects.toThrow(AuthError);

    expect(tokenStore.get()).toBeNull();
  });

  it('no almacena token si el login falla', async () => {
    vi.mocked(mockRepo.login).mockRejectedValue(new AuthError());

    await expect(loginUseCase(mockRepo, 'x@x.com', 'bad')).rejects.toThrow();

    expect(tokenStore.isSet()).toBe(false);
  });
});
