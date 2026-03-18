import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteUserUseCase } from '../../src/application/delete-user-use-case.ts';
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
  createUser: vi.fn(),
  deleteUser: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('deleteUserUseCase', () => {
  it('llama a repo.deleteUser con el id correcto', async () => {
    vi.mocked(mockRepo.deleteUser).mockResolvedValue(undefined);

    await deleteUserUseCase(mockRepo, 'user-123');

    expect(mockRepo.deleteUser).toHaveBeenCalledWith('user-123');
  });

  it('lanza CliError si el id está vacío', async () => {
    await expect(deleteUserUseCase(mockRepo, '')).rejects.toThrow(CliError);
    expect(mockRepo.deleteUser).not.toHaveBeenCalled();
  });

  it('lanza CliError si el id es solo espacios', async () => {
    await expect(deleteUserUseCase(mockRepo, '   ')).rejects.toThrow(CliError);
    expect(mockRepo.deleteUser).not.toHaveBeenCalled();
  });

  it('propaga NotFoundError si el repositorio lo lanza', async () => {
    vi.mocked(mockRepo.deleteUser).mockRejectedValue(new NotFoundError());

    await expect(deleteUserUseCase(mockRepo, '999')).rejects.toThrow(NotFoundError);
  });
});
