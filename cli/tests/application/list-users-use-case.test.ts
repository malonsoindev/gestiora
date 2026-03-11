import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listUsersUseCase } from '../../src/application/list-users-use-case.ts';
import type { UserRepository } from '../../src/domain/ports.ts';
import type { User } from '../../src/domain/user.ts';
import { AuthError } from '../../src/domain/errors.ts';

const ana: User = { userId: '1', email: 'a@example.com', name: 'Ana García', roles: ['Usuario'], status: 'ACTIVE', createdAt: '2024-01-01T00:00:00.000Z' };
const bruno: User = { userId: '2', email: 'b@example.com', name: 'Bruno López', roles: ['Usuario'], status: 'INACTIVE', createdAt: '2024-01-01T00:00:00.000Z' };

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

describe('listUsersUseCase', () => {
  it('devuelve la lista de usuarios ordenada alfabéticamente por email', async () => {
    vi.mocked(mockRepo.listUsers).mockResolvedValue([bruno, ana]);

    const result = await listUsersUseCase(mockRepo);

    const [first, second] = result;
    expect(first?.email).toBe('a@example.com');
    expect(second?.email).toBe('b@example.com');
  });

  it('devuelve array vacío si no hay usuarios', async () => {
    vi.mocked(mockRepo.listUsers).mockResolvedValue([]);

    const result = await listUsersUseCase(mockRepo);

    expect(result).toEqual([]);
  });

  it('propaga AuthError si el repositorio lo lanza', async () => {
    vi.mocked(mockRepo.listUsers).mockRejectedValue(new AuthError());

    await expect(listUsersUseCase(mockRepo)).rejects.toThrow(AuthError);
  });
});
