import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findUsersUseCase } from '../../src/application/find-users-use-case.ts';
import type { UserRepository } from '../../src/domain/ports.ts';
import type { User } from '../../src/domain/user.ts';

const ana: User = { userId: '1', email: 'ana@example.com', name: 'Ana García', roles: ['Usuario'], status: 'ACTIVE', createdAt: '2024-01-01T00:00:00.000Z' };
const bruno: User = { userId: '2', email: 'bruno@example.com', name: 'Bruno López', roles: ['Usuario'], status: 'INACTIVE', createdAt: '2024-01-01T00:00:00.000Z' };
const mockUsers: User[] = [ana, bruno];

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

describe('findUsersUseCase', () => {
  it('devuelve los usuarios que coinciden con la búsqueda', async () => {
    vi.mocked(mockRepo.findUsers).mockResolvedValue([ana]);

    const result = await findUsersUseCase(mockRepo, 'ana');

    expect(mockRepo.findUsers).toHaveBeenCalledWith('ana');
    expect(result).toHaveLength(1);
    const [first] = result;
    expect(first?.email).toBe('ana@example.com');
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
