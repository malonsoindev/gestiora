import { describe, it, expect, vi, beforeEach } from 'vitest';
import { input, password, confirm } from '@inquirer/prompts';
import { listUsersUseCase } from '../../src/application/list-users-use-case.ts';
import { findUsersUseCase } from '../../src/application/find-users-use-case.ts';
import { updateUserUseCase } from '../../src/application/update-user-use-case.ts';
import { disableUserUseCase } from '../../src/application/disable-user-use-case.ts';
import { resetPasswordUseCase } from '../../src/application/reset-password-use-case.ts';
import {
  handleListUsers,
  handleFindUsers,
  handleUpdateUser,
  handleDisableUser,
  handleResetPassword,
} from '../../src/infrastructure/ui/main-menu.ts';
import type { UserRepository } from '../../src/domain/ports.ts';
import type { UserRole } from '../../src/domain/user.ts';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  password: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('../../src/application/list-users-use-case.ts', () => ({ listUsersUseCase: vi.fn() }));
vi.mock('../../src/application/find-users-use-case.ts', () => ({ findUsersUseCase: vi.fn() }));
vi.mock('../../src/application/update-user-use-case.ts', () => ({ updateUserUseCase: vi.fn() }));
vi.mock('../../src/application/disable-user-use-case.ts', () => ({ disableUserUseCase: vi.fn() }));
vi.mock('../../src/application/reset-password-use-case.ts', () => ({ resetPasswordUseCase: vi.fn() }));

const mockRepo: UserRepository = {
  login: vi.fn(),
  listUsers: vi.fn(),
  findUsers: vi.fn(),
  updateUser: vi.fn(),
  disableUser: vi.fn(),
  resetPassword: vi.fn(),
};

const mockUser = {
  userId: '1',
  email: 'a@b.com',
  name: 'A',
  roles: ['Usuario'] as UserRole[],
  status: 'ACTIVE' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleListUsers', () => {
  it('llama a listUsersUseCase con el repo', async () => {
    vi.mocked(listUsersUseCase).mockResolvedValue([mockUser]);

    await handleListUsers(mockRepo);

    expect(listUsersUseCase).toHaveBeenCalledWith(mockRepo);
  });
});

describe('handleFindUsers', () => {
  it('pide query y llama a findUsersUseCase', async () => {
    vi.mocked(input).mockResolvedValue('ana');
    vi.mocked(findUsersUseCase).mockResolvedValue([mockUser]);

    await handleFindUsers(mockRepo);

    expect(findUsersUseCase).toHaveBeenCalledWith(mockRepo, 'ana');
  });
});

describe('handleUpdateUser', () => {
  it('construye el payload con los campos no vacíos y llama a updateUserUseCase', async () => {
    vi.mocked(input)
      .mockResolvedValueOnce('1')      // id
      .mockResolvedValueOnce('Nuevo')  // name
      .mockResolvedValueOnce('');      // avatar (vacío → se omite)
    vi.mocked(updateUserUseCase).mockResolvedValue(mockUser);

    await handleUpdateUser(mockRepo);

    expect(updateUserUseCase).toHaveBeenCalledWith(mockRepo, '1', { name: 'Nuevo' });
  });
});

describe('handleDisableUser', () => {
  it('deshabilita el usuario si el administrador confirma', async () => {
    vi.mocked(input).mockResolvedValue('1');
    vi.mocked(confirm).mockResolvedValue(true);
    vi.mocked(disableUserUseCase).mockResolvedValue(undefined);

    await handleDisableUser(mockRepo);

    expect(disableUserUseCase).toHaveBeenCalledWith(mockRepo, '1');
  });

  it('no llama a disableUserUseCase si el administrador cancela', async () => {
    vi.mocked(input).mockResolvedValue('1');
    vi.mocked(confirm).mockResolvedValue(false);

    await handleDisableUser(mockRepo);

    expect(disableUserUseCase).not.toHaveBeenCalled();
  });
});

describe('handleResetPassword', () => {
  it('llama a resetPasswordUseCase con los valores del prompt', async () => {
    vi.mocked(input).mockResolvedValue('1');
    vi.mocked(password)
      .mockResolvedValueOnce('NewPass1!')
      .mockResolvedValueOnce('NewPass1!');
    vi.mocked(resetPasswordUseCase).mockResolvedValue(undefined);

    await handleResetPassword(mockRepo);

    expect(resetPasswordUseCase).toHaveBeenCalledWith(mockRepo, '1', 'NewPass1!', 'NewPass1!');
  });
});
