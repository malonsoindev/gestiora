import { describe, it, expect, vi, beforeEach } from 'vitest';
import { input, password } from '@inquirer/prompts';
import { loginUseCase } from '../../src/application/login-use-case.ts';
import { runLoginMenu } from '../../src/infrastructure/ui/login-menu.ts';
import { AuthError, ForbiddenError } from '../../src/domain/errors.ts';
import type { UserRepository } from '../../src/domain/ports.ts';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  password: vi.fn(),
}));

vi.mock('../../src/application/login-use-case.ts', () => ({
  loginUseCase: vi.fn(),
}));

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
  vi.mocked(input).mockResolvedValue('admin@example.com');
  vi.mocked(password).mockResolvedValue('Pass1!');
  vi.mocked(loginUseCase).mockResolvedValue(undefined);
});

describe('runLoginMenu', () => {
  it('llama a loginUseCase con los valores del prompt y devuelve true', async () => {
    const result = await runLoginMenu(mockRepo);

    expect(loginUseCase).toHaveBeenCalledWith(mockRepo, 'admin@example.com', 'Pass1!');
    expect(result).toBe(true);
  });

  it('devuelve false si loginUseCase lanza ForbiddenError', async () => {
    vi.mocked(loginUseCase).mockRejectedValue(new ForbiddenError());

    const result = await runLoginMenu(mockRepo);

    expect(result).toBe(false);
  });

  it('devuelve false si loginUseCase lanza AuthError', async () => {
    vi.mocked(loginUseCase).mockRejectedValue(new AuthError());

    const result = await runLoginMenu(mockRepo);

    expect(result).toBe(false);
  });

  it('devuelve false si hay un error genérico de red', async () => {
    vi.mocked(loginUseCase).mockRejectedValue(new Error('Network error'));

    const result = await runLoginMenu(mockRepo);

    expect(result).toBe(false);
  });
});
