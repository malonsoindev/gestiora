import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findUsersUseCase } from '../../src/application/find-users-use-case.ts';
import type { UserRepository } from '../../src/domain/ports.ts';
import type { User } from '../../src/domain/user.ts';

const ana: User = { id: '1', email: 'ana@example.com', firstName: 'Ana', lastName: 'García', role: 'USER', status: 'ACTIVE' };
const bruno: User = { id: '2', email: 'bruno@example.com', firstName: 'Bruno', lastName: 'López', role: 'USER', status: 'INACTIVE' };
const mockUsers: User[] = [ana, bruno];

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

describe('findUsersUseCase', () => {
  it('devuelve los usuarios que coinciden con la búsqueda', async () => {
    vi.mocked(mockRepo.findUsers).mockResolvedValue([ana]);

    const result = await findUsersUseCase(mockRepo, 'ana');

    expect(mockRepo.findUsers).toHaveBeenCalledWith('ana');
    expect(result).toHaveLength(1);
    expect(result[0]!.email).toBe('ana@example.com');
  });

  it('devuelve array vacío si no hay coincidencias', async () => {
    vi.mocked(mockRepo.findUsers).mockResolvedValue([]);

    const result = await findUsersUseCase(mockRepo, 'xyz');

    expect(result).toEqual([]);
  });

  it('lanza error si la query está vacía', async () => {
    await expect(findUsersUseCase(mockRepo, '')).rejects.toThrow('La búsqueda no puede estar vacía');
    expect(mockRepo.findUsers).not.toHaveBeenCalled();
  });

  it('lanza error si la query es solo espacios', async () => {
    await expect(findUsersUseCase(mockRepo, '   ')).rejects.toThrow('La búsqueda no puede estar vacía');
    expect(mockRepo.findUsers).not.toHaveBeenCalled();
  });
});
