import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUserUseCase } from '../../src/application/create-user-use-case.ts';
import type { UserRepository } from '../../src/domain/ports.ts';
import type { CreateUserPayload, User } from '../../src/domain/user.ts';
import { CliError } from '../../src/domain/errors.ts';

const MOCK_PASS = 'Pass1234!';

const mockUser: User = {
  userId: 'new-id',
  email: 'new@example.com',
  name: 'Nuevo',
  roles: ['Usuario'],
  status: 'ACTIVE',
  createdAt: '2025-01-01T00:00:00.000Z',
};

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

describe('createUserUseCase', () => {
  it('crea el usuario y devuelve el usuario creado', async () => {
    vi.mocked(mockRepo.createUser).mockResolvedValue(mockUser);

    const payload: CreateUserPayload = {
      email: 'new@example.com',
      password: MOCK_PASS,
      name: 'Nuevo',
      roles: ['Usuario'],
    };

    const result = await createUserUseCase(mockRepo, payload);

    expect(mockRepo.createUser).toHaveBeenCalledWith(payload);
    expect(result).toEqual(mockUser);
  });

  it('lanza CliError si el email está vacío', async () => {
    const payload: CreateUserPayload = { email: '', password: MOCK_PASS, roles: ['Usuario'] };
    await expect(createUserUseCase(mockRepo, payload)).rejects.toThrow(CliError);
    expect(mockRepo.createUser).not.toHaveBeenCalled();
  });

  it('lanza CliError si el email es solo espacios', async () => {
    const payload: CreateUserPayload = { email: '   ', password: MOCK_PASS, roles: ['Usuario'] };
    await expect(createUserUseCase(mockRepo, payload)).rejects.toThrow(CliError);
    expect(mockRepo.createUser).not.toHaveBeenCalled();
  });

  it('lanza CliError si la contraseña está vacía', async () => {
    const payload: CreateUserPayload = { email: 'a@b.com', password: '', roles: ['Usuario'] };
    await expect(createUserUseCase(mockRepo, payload)).rejects.toThrow(CliError);
    expect(mockRepo.createUser).not.toHaveBeenCalled();
  });

  it('lanza CliError si el array de roles está vacío', async () => {
    const payload: CreateUserPayload = { email: 'a@b.com', password: MOCK_PASS, roles: [] };
    await expect(createUserUseCase(mockRepo, payload)).rejects.toThrow(CliError);
    expect(mockRepo.createUser).not.toHaveBeenCalled();
  });

  it('propaga errores del repositorio', async () => {
    vi.mocked(mockRepo.createUser).mockRejectedValue(new CliError('Email en uso'));

    const payload: CreateUserPayload = { email: 'dup@example.com', password: MOCK_PASS, roles: ['Usuario'] };
    await expect(createUserUseCase(mockRepo, payload)).rejects.toThrow(CliError);
  });
});
