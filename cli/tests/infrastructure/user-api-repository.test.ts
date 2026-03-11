import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserApiRepository } from '../../src/infrastructure/api/user-api-repository.ts';
import { tokenStore } from '../../src/core/token-store.ts';
import { AuthError, NotFoundError } from '../../src/domain/errors.ts';

const BASE_URL = 'http://localhost:3000';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
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

      const token = await repo.login('admin@example.com', 'Pass1!');

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'admin@example.com', password: 'Pass1!' }),
        }),
      );
      expect(token).toBe('tok123');
    });

    it('lanza AuthError si el servidor devuelve 401', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message: 'Invalid credentials' }, 401));

      await expect(repo.login('a@b.com', 'wrong')).rejects.toThrow(AuthError);
    });
  });

  describe('listUsers', () => {
    it('devuelve la lista de usuarios', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(
        jsonResponse({ users: [{ id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'USER', status: 'ACTIVE' }], total: 1 }),
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
        jsonResponse({ users: [{ id: '1', email: 'ana@b.com', firstName: 'Ana', lastName: 'G', role: 'USER', status: 'ACTIVE' }], total: 1 }),
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
      const updated = { id: '1', email: 'new@b.com', firstName: 'New', lastName: 'G', role: 'USER', status: 'ACTIVE' };
      mockFetch.mockResolvedValue(jsonResponse(updated));

      const result = await repo.updateUser('1', { email: 'new@b.com' });

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/admin/users/1`,
        expect.objectContaining({ method: 'PUT' }),
      );
      expect(result.email).toBe('new@b.com');
    });

    it('lanza NotFoundError si el servidor devuelve 404', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(jsonResponse({ message: 'Not found' }, 404));

      await expect(repo.updateUser('999', { firstName: 'X' })).rejects.toThrow(NotFoundError);
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

      await repo.resetPassword('1', { password: 'NewPass1!' });

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/admin/users/1/password`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ password: 'NewPass1!' }),
        }),
      );
    });

    it('lanza NotFoundError si el servidor devuelve 404', async () => {
      tokenStore.set('tok123');
      mockFetch.mockResolvedValue(jsonResponse({ message: 'Not found' }, 404));

      await expect(repo.resetPassword('999', { password: 'X' })).rejects.toThrow(NotFoundError);
    });
  });
});
