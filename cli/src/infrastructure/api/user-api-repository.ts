import type { UserRepository } from '../../domain/ports.ts';
import type { User, UpdateUserPayload, ResetPasswordPayload, CreateUserPayload, CreateUserResult } from '../../domain/user.ts';
import { AuthError, NotFoundError, CliError } from '../../domain/errors.ts';
import { tokenStore } from '../../core/token-store.ts';

export class UserApiRepository implements UserRepository {
  constructor(private readonly baseUrl: string) {}

  async login(email: string, password: string): Promise<string> {
    const res = await this.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }, 'Error al iniciar sesión');

    const data = await res.json() as { accessToken: string };
    return data.accessToken;
  }

  async listUsers(): Promise<User[]> {
    const res = await this.request('/admin/users', {
      method: 'GET',
      headers: this.authHeadersNoBody(),
    }, 'Error al listar usuarios');

    const data = await res.json() as { items: User[]; total: number; page: number; pageSize: number };
    return data.items;
  }

  async findUsers(query: string): Promise<User[]> {
    const res = await this.request(`/admin/users?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: this.authHeadersNoBody(),
    }, 'Error al buscar usuarios');

    const data = await res.json() as { items: User[]; total: number; page: number; pageSize: number };
    return data.items;
  }

  async updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
    const res = await this.request(`/admin/users/${id}`, {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    }, 'Error al actualizar usuario', true);

    return res.json() as Promise<User>;
  }

  async disableUser(id: string): Promise<void> {
    await this.request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify({ status: 'INACTIVE' }),
    }, 'Error al deshabilitar usuario', true);
  }

  async resetPassword(id: string, payload: ResetPasswordPayload): Promise<void> {
    await this.request(`/admin/users/${id}/password`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    }, 'Error al resetear contraseña', true);
  }

  // TODO: deuda técnica — esta lógica debería ejecutarse en el backend tras cambiar
  // contraseña o deshabilitar usuario, igual que hace SoftDeleteUserUseCase.
  // Pendiente refactorizar ChangeUserPasswordUseCase y UpdateUserStatusUseCase
  // para que invoquen sessionRepository.revokeByUserId() internamente.
  async revokeUserSessions(id: string): Promise<void> {
    await this.request(`/admin/users/${id}/sessions/revoke`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({}),
    }, 'Error al revocar sesiones', true);
  }

  async createUser(payload: CreateUserPayload): Promise<CreateUserResult> {
    const res = await this.request('/admin/users', {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(payload),
    }, 'Error al crear usuario');

    return res.json() as Promise<CreateUserResult>;
  }

  async deleteUser(id: string): Promise<void> {
    await this.request(`/admin/users/${id}`, {
      method: 'DELETE',
      headers: this.authHeadersNoBody(),
    }, 'Error al eliminar usuario', true);
  }

  private async request(
    endpoint: string,
    options: RequestInit,
    errorMessage: string,
    expect404 = false,
  ): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, options);

    if (res.status === 401) throw new AuthError();
    if (expect404 && res.status === 404) throw new NotFoundError();
    if (!res.ok) throw new CliError(`${errorMessage} (${res.status})`);

    return res;
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
