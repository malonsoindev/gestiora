import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginUseCase } from '../../src/application/login-use-case.ts';
import { tokenStore } from '../../src/core/token-store.ts';
import type { UserRepository } from '../../src/domain/ports.ts';
import { AuthError } from '../../src/domain/errors.ts';

const mockRepo: UserRepository = {
  login: vi.fn(),
  listUsers: vi.fn(),
  findUsers: vi.fn(),
  updateUser: vi.fn(),
  disableUser: vi.fn(),
  resetPassword: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  tokenStore.clear();
});

describe('loginUseCase', () => {
  it('almacena el token en memoria cuando las credenciales son correctas', async () => {
    vi.mocked(mockRepo.login).mockResolvedValue('token-abc-123');

    await loginUseCase(mockRepo, 'admin@example.com', 'AdminPass1!a');

    expect(mockRepo.login).toHaveBeenCalledWith('admin@example.com', 'AdminPass1!a');
    expect(tokenStore.get()).toBe('token-abc-123');
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
