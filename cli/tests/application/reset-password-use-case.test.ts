import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetPasswordUseCase } from '../../src/application/reset-password-use-case.ts';
import type { UserRepository } from '../../src/domain/ports.ts';
import { CliError, NotFoundError } from '../../src/domain/errors.ts';

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
});

describe('resetPasswordUseCase', () => {
  it('resetea la contraseña cuando las dos coinciden', async () => {
    vi.mocked(mockRepo.resetPassword).mockResolvedValue(undefined);

    await resetPasswordUseCase(mockRepo, '1', 'NewPass1!', 'NewPass1!');

    expect(mockRepo.resetPassword).toHaveBeenCalledWith('1', { password: 'NewPass1!' });
  });

  it('lanza error si las contraseñas no coinciden', async () => {
    await expect(
      resetPasswordUseCase(mockRepo, '1', 'NewPass1!', 'OtroPass2!'),
    ).rejects.toThrow(CliError);
    expect(mockRepo.resetPassword).not.toHaveBeenCalled();
  });

  it('lanza error si el id está vacío', async () => {
    await expect(
      resetPasswordUseCase(mockRepo, '', 'NewPass1!', 'NewPass1!'),
    ).rejects.toThrow(CliError);
    expect(mockRepo.resetPassword).not.toHaveBeenCalled();
  });

  it('lanza error si la contraseña está vacía', async () => {
    await expect(
      resetPasswordUseCase(mockRepo, '1', '', ''),
    ).rejects.toThrow(CliError);
    expect(mockRepo.resetPassword).not.toHaveBeenCalled();
  });

  it('propaga NotFoundError si el repositorio lo lanza', async () => {
    vi.mocked(mockRepo.resetPassword).mockRejectedValue(new NotFoundError());

    await expect(
      resetPasswordUseCase(mockRepo, '999', 'NewPass1!', 'NewPass1!'),
    ).rejects.toThrow(NotFoundError);
  });
});
