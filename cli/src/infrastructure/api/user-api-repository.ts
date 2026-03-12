import type { UserRepository } from '../../domain/ports.ts';
import type { User, UpdateUserPayload, ResetPasswordPayload, CreateUserPayload, CreateUserResult } from '../../domain/user.ts';
import { AuthError, NotFoundError, CliError } from '../../domain/errors.ts';
import { tokenStore } from '../../core/token-store.ts';

export class UserApiRepository implements UserRepository {
  constructor(private readonly baseUrl: string) {}

  async login(email: string, password: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.status === 401) throw new AuthError();
    if (!res.ok) throw new CliError(`Error al iniciar sesión (${res.status})`);

    const data = await res.json() as { accessToken: string };
    return data.accessToken;
  }

  async listUsers(): Promise<User[]> {
    const res = await fetch(`${this.baseUrl}/admin/users`, {
      method: 'GET',
      headers: this.authHeadersNoBody(),
    });

    if (res.status === 401) throw new AuthError();
    if (!res.ok) throw new CliError(`Error al listar usuarios (${res.status})`);

    const data = await res.json() as { items: User[]; total: number; page: number; pageSize: number };
    return data.items;
  }

  async findUsers(query: string): Promise<User[]> {
    const url = `${this.baseUrl}/admin/users?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.authHeadersNoBody(),
    });

    if (res.status === 401) throw new AuthError();
    if (!res.ok) throw new CliError(`Error al buscar usuarios (${res.status})`);

    const data = await res.json() as { items: User[]; total: number; page: number; pageSize: number };
    return data.items;
  }

  async updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
    const res = await fetch(`${this.baseUrl}/admin/users/${id}`, {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.status === 401) throw new AuthError();
    if (res.status === 404) throw new NotFoundError();
    if (!res.ok) throw new CliError(`Error al actualizar usuario (${res.status})`);

    return res.json() as Promise<User>;
  }

  async disableUser(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/admin/users/${id}/status`, {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify({ status: 'INACTIVE' }),
    });

    if (res.status === 401) throw new AuthError();
    if (res.status === 404) throw new NotFoundError();
    if (!res.ok) throw new CliError(`Error al deshabilitar usuario (${res.status})`);
  }

  async resetPassword(id: string, payload: ResetPasswordPayload): Promise<void> {
    const res = await fetch(`${this.baseUrl}/admin/users/${id}/password`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.status === 401) throw new AuthError();
    if (res.status === 404) throw new NotFoundError();
    if (!res.ok) throw new CliError(`Error al resetear contraseña (${res.status})`);
  }

  // TODO: deuda técnica — esta lógica debería ejecutarse en el backend tras cambiar
  // contraseña o deshabilitar usuario, igual que hace SoftDeleteUserUseCase.
  // Pendiente refactorizar ChangeUserPasswordUseCase y UpdateUserStatusUseCase
  // para que invoquen sessionRepository.revokeByUserId() internamente.
  async revokeUserSessions(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/admin/users/${id}/sessions/revoke`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({}),
    });

    if (res.status === 401) throw new AuthError();
    if (res.status === 404) throw new NotFoundError();
    if (!res.ok) throw new CliError(`Error al revocar sesiones (${res.status})`);
  }

  async createUser(payload: CreateUserPayload): Promise<CreateUserResult> {
    const res = await fetch(`${this.baseUrl}/admin/users`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.status === 401) throw new AuthError();
    if (!res.ok) throw new CliError(`Error al crear usuario (${res.status})`);

    return res.json() as Promise<CreateUserResult>;
  }

  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/admin/users/${id}`, {
      method: 'DELETE',
      headers: this.authHeadersNoBody(),
    });

    if (res.status === 401) throw new AuthError();
    if (res.status === 404) throw new NotFoundError();
    if (!res.ok) throw new CliError(`Error al eliminar usuario (${res.status})`);
  }

  private authHeaders(): Record<string, string> {
    const token = tokenStore.get();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private authHeadersNoBody(): Record<string, string> {
    const token = tokenStore.get();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
