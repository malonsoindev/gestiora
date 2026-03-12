import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserApiRepository } from '../../src/infrastructure/api/user-api-repository.ts';
import { tokenStore } from '../../src/core/token-store.ts';
import { AuthError, NotFoundError } from '../../src/domain/errors.ts';

const BASE_URL = 'http://localhost:3000';
const MOCK_PASS = 'Pass1234!';
const MOCK_PASS_ALT = 'NewPass1234!';
const MOCK_SHORT_CREDENTIAL = 'X';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  vi.clearAllMocks();
  tokenStore.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('UserApiRepository', () => {
  const repo = new UserApiRepository(BASE_URL);

  describe('login', () => {
    it('devuelve el accessToken en login correcto', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ accessToken: 'tok123', refreshToken: 'ref456' }));

      const token = await repo.login('admin@example.com', MOCK_PASS);

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'admin@example.com', password: MOCK_PASS }),
        }),
      );
      expect(token).toBe('tok123');
    });

    it('lanza AuthError si el servidor devuelve 401', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message: 'Invalid credentials' }, 401));

      await expect(repo.login('a@b.com', MOCK_PASS_ALT)).rejects.toThrow(AuthError);
    });
  });

  describe('listUsers', () => {
    it('devuelve la lista de usuarios', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(
        jsonResponse({ items: [{ userId: '1', email: 'a@b.com', name: 'A', roles: ['Usuario'], status: 'ACTIVE', createdAt: '2024-01-01T00:00:00.000Z' }], total: 1, page: 1, pageSize: 10 }),
      );

      const users = await repo.listUsers();

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/admin/users`,
        expect.objectContaining({ method: 'GET' }),
      );
      expect(users).toHaveLength(1);
      expect(users[0]!.email).toBe('a@b.com');
    });

    it('lanza AuthError si el servidor devuelve 401', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401));

      await expect(repo.listUsers()).rejects.toThrow(AuthError);
    });
  });

  describe('findUsers', () => {
    it('devuelve usuarios filtrados por query', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(
        jsonResponse({ items: [{ userId: '1', email: 'ana@b.com', name: 'Ana', roles: ['Usuario'], status: 'ACTIVE', createdAt: '2024-01-01T00:00:00.000Z' }], total: 1, page: 1, pageSize: 10 }),
      );

      const users = await repo.findUsers('ana');

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/admin/users?query=ana`,
        expect.objectContaining({ method: 'GET' }),
      );
      expect(users[0]!.email).toBe('ana@b.com');
    });
  });

  describe('updateUser', () => {
    it('actualiza el usuario y devuelve el usuario actualizado', async () => {
      tokenStore.set('tok123');
      const updated = { userId: '1', email: 'new@b.com', name: 'New', roles: ['Usuario'], status: 'ACTIVE', createdAt: '2024-01-01T00:00:00.000Z' };
      mockFetch.mockResolvedValue(jsonResponse(updated));

      const result = await repo.updateUser('1', { name: 'New' });

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/admin/users/1`,
        expect.objectContaining({ method: 'PUT' }),
      );
      expect(result.email).toBe('new@b.com');
    });

    it('lanza NotFoundError si el servidor devuelve 404', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(jsonResponse({ message: 'Not found' }, 404));

      await expect(repo.updateUser('999', { name: 'X' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('disableUser', () => {
    it('envía PATCH con status INACTIVE y no devuelve nada', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(jsonResponse({ id: '1', status: 'INACTIVE' }));

      await repo.disableUser('1');

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/admin/users/1/status`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'INACTIVE' }),
        }),
      );
    });

    it('lanza NotFoundError si el servidor devuelve 404', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(jsonResponse({ message: 'Not found' }, 404));

      await expect(repo.disableUser('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('resetPassword', () => {
    it('envía POST con la nueva contraseña y no devuelve nada', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

      await repo.resetPassword('1', { newPassword: MOCK_PASS_ALT });

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/admin/users/1/password`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ newPassword: MOCK_PASS_ALT }),
        }),
      );
    });

    it('lanza NotFoundError si el servidor devuelve 404', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(jsonResponse({ message: 'Not found' }, 404));

      await expect(repo.resetPassword('999', { newPassword: MOCK_SHORT_CREDENTIAL })).rejects.toThrow(NotFoundError);
    });
  });

  describe('revokeUserSessions', () => {
    it('envía DELETE a sessions/revoke y no devuelve nada', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

      await repo.revokeUserSessions('1');

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/admin/users/1/sessions/revoke`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('lanza NotFoundError si el servidor devuelve 404', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(jsonResponse({ message: 'Not found' }, 404));

      await expect(repo.revokeUserSessions('999')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createUser', () => {
    it('envía POST con el payload y devuelve el usuario creado', async () => {
      tokenStore.set('tok123');
      const created = {
        userId: 'new-id',
        email: 'new@example.com',
        name: 'Nuevo',
        roles: ['Usuario'],
        status: 'ACTIVE',
        createdAt: '2025-01-01T00:00:00.000Z',
      };
      mockFetch.mockResolvedValue(jsonResponse(created, 201));

      const payload = { email: 'new@example.com', password: MOCK_PASS, name: 'Nuevo', roles: ['Usuario'] as const };
      const result = await repo.createUser(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/admin/users`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      );
      expect(result.userId).toBe('new-id');
    });

    it('lanza AuthError si el servidor devuelve 401', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401));

      await expect(repo.createUser({ email: 'a@b.com', password: MOCK_PASS_ALT, roles: ['Usuario'] })).rejects.toThrow(AuthError);
    });
  });

  describe('deleteUser', () => {
    it('envía DELETE a /admin/users/:id sin Content-Type y no devuelve nada', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

      await repo.deleteUser('user-123');

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/admin/users/user-123`,
        expect.objectContaining({
          method: 'DELETE',
          headers: { Authorization: 'Bearer tok123' },
        }),
      );
    });

    it('lanza NotFoundError si el servidor devuelve 404', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(jsonResponse({ message: 'Not found' }, 404));

      await expect(repo.deleteUser('999')).rejects.toThrow(NotFoundError);
    });

    it('lanza AuthError si el servidor devuelve 401', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401));

      await expect(repo.deleteUser('1')).rejects.toThrow(AuthError);
    });
  });
});
