import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres/postgres-user.repository.js';
import { PostgresSessionRepository } from '@infrastructure/persistence/postgres/postgres-session.repository.js';
import { PostgresLoginAttemptRepository } from '@infrastructure/persistence/postgres/postgres-login-attempt.repository.js';
import { BcryptPasswordHasher } from '@infrastructure/adapters/bcrypt-password-hasher.js';
import { SimpleRefreshTokenHasher } from '@infrastructure/adapters/simple-refresh-token-hasher.js';
import { JwtTokenService } from '@infrastructure/adapters/jwt-token.service.js';
import { LoginUserUseCase } from '@application/use-cases/login-user.use-case.js';
import { RefreshAccessTokenUseCase } from '@application/use-cases/refresh-access-token.use-case.js';
import { LogoutUserUseCase } from '@application/use-cases/logout-user.use-case.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import { Email } from '@domain/value-objects/email.value-object.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { SessionStatus } from '@domain/entities/session.entity.js';
import { AuthInvalidRefreshTokenError } from '@domain/errors/auth-invalid-refresh-token.error.js';
import { ok } from '@shared/result.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { fixedNow } from '@tests/shared/fixed-now.js';

const describeIf = process.env.DATABASE_URL ? describe : describe.skip;
class SessionIdGeneratorStub {
    constructor(private readonly id: string) {}

    generate(): string {
        return this.id;
    }
}

class AuditLoggerStub {
    async log() {
        return ok(undefined);
    }
}

const validLoginCredential = 'AdminPass1!a';
const baseLoginRequest = {
    email: 'user@example.com',
    password: validLoginCredential,
    ip: '127.0.0.1',
    userAgent: 'vitest',
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describeIf('Postgres auth flow', () => {
    const sql = postgres(process.env.DATABASE_URL as string, { max: 1 });
    const userRepository = new PostgresUserRepository(sql);
    const sessionRepository = new PostgresSessionRepository(sql);
    const loginAttemptRepository = new PostgresLoginAttemptRepository(sql);
    const passwordHasher = new BcryptPasswordHasher();
    const refreshTokenHasher = new SimpleRefreshTokenHasher();
    const tokenService = new JwtTokenService('access-secret', 'refresh-secret', 900, 2_592_000);
    const dateProvider = new DateProviderStub(fixedNow);
    const auditLogger = new AuditLoggerStub();
    const sessionIdGenerator = new SessionIdGeneratorStub('session-1');

    const loginUseCase = new LoginUserUseCase({
        userRepository,
        sessionRepository,
        passwordHasher,
        tokenService,
        refreshTokenHasher,
        sessionIdGenerator,
        auditLogger,
        loginRateLimiter: { assertAllowed: async () => ok(undefined) },
        loginAttemptRepository,
        dateProvider,
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 2_592_000,
    });

    const refreshUseCase = new RefreshAccessTokenUseCase({
        sessionRepository,
        userRepository,
        tokenService,
        refreshTokenHasher,
        auditLogger,
        dateProvider,
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 2_592_000,
        rotateRefreshTokens: true,
    });

    const logoutUseCase = new LogoutUserUseCase({
        sessionRepository,
        refreshTokenHasher,
        auditLogger,
        dateProvider,
    });

    beforeAll(async () => {
        await sql`
            create table if not exists users (
                id text primary key,
                email text unique not null,
                password_hash text not null,
                status text not null,
                locked_until timestamptz null,
                roles text[] not null,
                created_at timestamptz not null,
                updated_at timestamptz not null
            )
        `;

        await sql`
            create table if not exists sessions (
                id text primary key,
                user_id text not null references users(id),
                refresh_token_hash text unique not null,
                status text not null,
                created_at timestamptz not null,
                last_used_at timestamptz not null,
                expires_at timestamptz not null,
                revoked_at timestamptz null,
                revoked_by text null,
                ip text null,
                user_agent text null
            )
        `;

        await sql`
            create table if not exists login_attempts (
                id bigserial primary key,
                email text not null,
                ip text null,
                succeeded boolean not null,
                created_at timestamptz not null
            )
        `;
    });

    beforeEach(async () => {
        await sql`delete from login_attempts`;
        await sql`delete from sessions`;
        await sql`delete from users`;
    });

    afterAll(async () => {
        await sql.end({ timeout: 5 });
    });

    it('logs in, rotates refresh token, and revokes session on logout', async () => {
        const passwordHashResult = await passwordHasher.hash(validLoginCredential);
        if (!passwordHashResult.success) {
            throw passwordHashResult.error;
        }

        const user = User.create({
            id: 'user-1',
            email: Email.create('user@example.com'),
            passwordHash: passwordHashResult.value,
            status: UserStatus.Active,
            roles: [UserRole.user()],
            createdAt: fixedNow,
            updatedAt: fixedNow,
        });

        const createResult = await userRepository.create(user);
        expect(createResult.success).toBe(true);

        const loginResult = await loginUseCase.execute(baseLoginRequest);

        expect(loginResult.success).toBe(true);
        if (!loginResult.success) {
            return;
        }

        const refreshHashResult = refreshTokenHasher.hash(loginResult.value.refreshToken);
        if (!refreshHashResult.success) {
            throw refreshHashResult.error;
        }

        const sessionResult = await sessionRepository.findByRefreshTokenHash(refreshHashResult.value);
        expect(sessionResult.success).toBe(true);
        expect(sessionResult.success && sessionResult.value?.status).toBe(SessionStatus.Active);

        const attempts = await sql`
            select count(*)::int as count from login_attempts where email = 'user@example.com'
        `;
        expect(attempts[0]?.count).toBe(1);

        await delay(1100);

        const refreshResult = await refreshUseCase.execute({
            refreshToken: loginResult.value.refreshToken,
        });

        expect(refreshResult.success).toBe(true);
        if (!refreshResult.success) {
            return;
        }

        const oldSessionResult = await sessionRepository.findByRefreshTokenHash(refreshHashResult.value);
        expect(oldSessionResult.success).toBe(true);
        expect(oldSessionResult.success && oldSessionResult.value).toBeNull();

        const newRefresh = refreshResult.value.refreshToken;
        expect(newRefresh).toBeTruthy();
        if (!newRefresh) {
            return;
        }

        const newHashResult = refreshTokenHasher.hash(newRefresh);
        if (!newHashResult.success) {
            throw newHashResult.error;
        }

        const rotatedSessionResult = await sessionRepository.findByRefreshTokenHash(newHashResult.value);
        expect(rotatedSessionResult.success).toBe(true);
        expect(rotatedSessionResult.success && rotatedSessionResult.value?.status).toBe(SessionStatus.Active);

        const logoutResult = await logoutUseCase.execute({ refreshToken: newRefresh });
        expect(logoutResult.success).toBe(true);

        const revokedSessionResult = await sessionRepository.findByRefreshTokenHash(newHashResult.value);
        expect(revokedSessionResult.success).toBe(true);
        expect(revokedSessionResult.success && revokedSessionResult.value?.status).toBe(SessionStatus.Revoked);

        const refreshAfterLogout = await refreshUseCase.execute({ refreshToken: newRefresh });
        expect(refreshAfterLogout.success).toBe(false);
        if (!refreshAfterLogout.success) {
            expect(refreshAfterLogout.error).toBeInstanceOf(AuthInvalidRefreshTokenError);
        }
    });
});
