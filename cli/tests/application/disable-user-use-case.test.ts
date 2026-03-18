import { describe, it, expect, vi, beforeEach } from 'vitest';
import { disableUserUseCase } from '../../src/application/disable-user-use-case.ts';
import type { UserRepository } from '../../src/domain/ports.ts';
import { CliError, NotFoundError } from '../../src/domain/errors.ts';

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
});

describe('disableUserUseCase', () => {
  it('deshabilita el usuario correctamente', async () => {
    vi.mocked(mockRepo.disableUser).mockResolvedValue(undefined);
    vi.mocked(mockRepo.revokeUserSessions).mockResolvedValue(undefined);

    await disableUserUseCase(mockRepo, '1');

    expect(mockRepo.disableUser).toHaveBeenCalledWith('1');
    expect(mockRepo.revokeUserSessions).toHaveBeenCalledWith('1');
  });

  it('lanza error si el id está vacío', async () => {
    await expect(disableUserUseCase(mockRepo, '')).rejects.toThrow(CliError);
    expect(mockRepo.disableUser).not.toHaveBeenCalled();
  });

  it('lanza error si el id es solo espacios', async () => {
    await expect(disableUserUseCase(mockRepo, '   ')).rejects.toThrow(CliError);
    expect(mockRepo.disableUser).not.toHaveBeenCalled();
  });

  it('propaga NotFoundError si el repositorio lo lanza', async () => {
    vi.mocked(mockRepo.disableUser).mockRejectedValue(new NotFoundError());

    await expect(disableUserUseCase(mockRepo, '999')).rejects.toThrow(NotFoundError);
  });
});
