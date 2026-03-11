import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateUserUseCase } from '../../src/application/update-user-use-case.ts';
import type { UserRepository } from '../../src/domain/ports.ts';
import type { User } from '../../src/domain/user.ts';
import { CliError, NotFoundError } from '../../src/domain/errors.ts';

const mockUser: User = {
  userId: '1',
  email: 'ana@example.com',
  name: 'Ana García',
  roles: ['Usuario'],
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00.000Z',
};

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

describe('updateUserUseCase', () => {
  it('actualiza el usuario con los campos proporcionados', async () => {
    const updated = { ...mockUser, name: 'Ángela' };
    vi.mocked(mockRepo.updateUser).mockResolvedValue(updated);

    const result = await updateUserUseCase(mockRepo, '1', { name: 'Ángela' });

    expect(mockRepo.updateUser).toHaveBeenCalledWith('1', { name: 'Ángela' });
    expect(result.name).toBe('Ángela');
  });

  it('lanza error si el payload está vacío', async () => {
    await expect(updateUserUseCase(mockRepo, '1', {})).rejects.toThrow(CliError);
    expect(mockRepo.updateUser).not.toHaveBeenCalled();
  });

  it('lanza error si el id está vacío', async () => {
    await expect(updateUserUseCase(mockRepo, '', { name: 'Ana' })).rejects.toThrow(CliError);
    expect(mockRepo.updateUser).not.toHaveBeenCalled();
  });

  it('propaga NotFoundError si el repositorio lo lanza', async () => {
    vi.mocked(mockRepo.updateUser).mockRejectedValue(new NotFoundError());

    await expect(updateUserUseCase(mockRepo, '999', { firstName: 'X' })).rejects.toThrow(NotFoundError);
  });
});
