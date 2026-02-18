import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PostgresSessionRepository } from '@infrastructure/persistence/postgres/postgres-session.repository.js';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres/postgres-user.repository.js';
import { Session, SessionStatus } from '@domain/entities/session.entity.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import { Email } from '@domain/value-objects/email.value-object.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { createPostgresTestContext } from '@tests/shared/helpers/postgres-test-context.js';

const describeIf = process.env.DATABASE_URL ? describe : describe.skip;
const fixedNow = new Date('2026-03-10T10:00:00.000Z');

// Use unique prefix to avoid conflicts with other integration tests
const TEST_PREFIX = 'session-repo-test';
const USER_IDS = {
    one: `${TEST_PREFIX}-user-1`,
    two: `${TEST_PREFIX}-user-2`,
};
const SESSION_IDS = {
    one: `${TEST_PREFIX}-session-1`,
    two: `${TEST_PREFIX}-session-2`,
    three: `${TEST_PREFIX}-session-3`,
};

const createTestUser = (id: string, email: string): User => {
    return User.create({
        id,
        email: Email.create(email),
        passwordHash: 'hashed-password-test',
        status: UserStatus.Active,
        roles: [UserRole.user()],
        createdAt: fixedNow,
        updatedAt: fixedNow,
    });
};

const createTestSession = (overrides: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    status?: SessionStatus;
    expiresAt?: Date;
    revokedAt?: Date;
    revokedBy?: string;
    ip?: string;
    userAgent?: string;
}): Session => {
    const props: Parameters<typeof Session.create>[0] = {
        id: overrides.id,
        userId: overrides.userId,
        refreshTokenHash: overrides.refreshTokenHash,
        status: overrides.status ?? SessionStatus.Active,
        createdAt: fixedNow,
        lastUsedAt: fixedNow,
        expiresAt: overrides.expiresAt ?? new Date('2026-04-10T10:00:00.000Z'),
    };

    if (overrides.revokedAt !== undefined) {
        props.revokedAt = overrides.revokedAt;
    }
    if (overrides.revokedBy !== undefined) {
        props.revokedBy = overrides.revokedBy;
    }
    if (overrides.ip !== undefined) {
        props.ip = overrides.ip;
    }
    if (overrides.userAgent !== undefined) {
        props.userAgent = overrides.userAgent;
    }

    return Session.create(props);
};

describeIf('PostgresSessionRepository', () => {
    const ctx = createPostgresTestContext();
    let sessionRepository: PostgresSessionRepository;
    let userRepository: PostgresUserRepository;

    beforeAll(async () => {
        await ctx.setup();

        // Ensure users table exists (sessions depend on it via FK)
        await ctx.sql`
            create table if not exists users (
                id text primary key,
                email text unique not null,
                password_hash text not null,
                name text null,
                avatar text null,
                status text not null,
                locked_until timestamptz null,
                roles text[] not null,
                created_at timestamptz not null,
                updated_at timestamptz not null,
                deleted_at timestamptz null
            )
        `;

        await ctx.sql`
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

        sessionRepository = new PostgresSessionRepository(ctx.sql);
        userRepository = new PostgresUserRepository(ctx.sql);
    });

    beforeEach(async () => {
        await ctx.beginTransaction();

        // Clean up and seed test users within the transaction
        await ctx.sql`delete from sessions`;
        await ctx.sql`delete from users`;

        // Create test users for FK references
        const user1 = createTestUser(USER_IDS.one, `${TEST_PREFIX}-1@example.com`);
        const user2 = createTestUser(USER_IDS.two, `${TEST_PREFIX}-2@example.com`);
        await userRepository.create(user1);
        await userRepository.create(user2);
    });

    afterEach(async () => {
        await ctx.rollbackTransaction();
    });

    afterAll(async () => {
        await ctx.cleanup();
    });

    it('creates and retrieves a session by refresh token hash', async () => {
        const session = createTestSession({
            id: SESSION_IDS.one,
            userId: USER_IDS.one,
            refreshTokenHash: `${TEST_PREFIX}-hash-1`,
            ip: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
        });

        const createResult = await sessionRepository.create(session);
        expect(createResult.success).toBe(true);

        const findResult = await sessionRepository.findByRefreshTokenHash(`${TEST_PREFIX}-hash-1`);

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value?.id).toBe(SESSION_IDS.one);
            expect(findResult.value?.userId).toBe(USER_IDS.one);
            expect(findResult.value?.status).toBe(SessionStatus.Active);
            expect(findResult.value?.ip).toBe('192.168.1.1');
            expect(findResult.value?.userAgent).toBe('Mozilla/5.0');
        }
    });

    it('returns null when session not found by hash', async () => {
        const findResult = await sessionRepository.findByRefreshTokenHash('non-existent-hash');

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value).toBeNull();
        }
    });

    it('updates session status and refresh token hash', async () => {
        const session = createTestSession({
            id: SESSION_IDS.one,
            userId: USER_IDS.one,
            refreshTokenHash: `${TEST_PREFIX}-hash-old`,
        });
        await sessionRepository.create(session);

        const revokedAt = new Date('2026-03-11T10:00:00.000Z');
        const updatedSession = Session.create({
            id: SESSION_IDS.one,
            userId: USER_IDS.one,
            refreshTokenHash: `${TEST_PREFIX}-hash-new`,
            status: SessionStatus.Revoked,
            createdAt: fixedNow,
            lastUsedAt: revokedAt,
            expiresAt: new Date('2026-04-10T10:00:00.000Z'),
            revokedAt,
            revokedBy: 'admin-user-id',
        });

        const updateResult = await sessionRepository.update(updatedSession);
        expect(updateResult.success).toBe(true);

        // Old hash should not find the session anymore
        const oldHashResult = await sessionRepository.findByRefreshTokenHash(`${TEST_PREFIX}-hash-old`);
        expect(oldHashResult.success).toBe(true);
        if (oldHashResult.success) {
            expect(oldHashResult.value).toBeNull();
        }

        // New hash should find the updated session
        const newHashResult = await sessionRepository.findByRefreshTokenHash(`${TEST_PREFIX}-hash-new`);
        expect(newHashResult.success).toBe(true);
        if (newHashResult.success) {
            expect(newHashResult.value?.status).toBe(SessionStatus.Revoked);
            expect(newHashResult.value?.revokedBy).toBe('admin-user-id');
            expect(newHashResult.value?.revokedAt).toBeDefined();
        }
    });

    it('revokes all active sessions for a user', async () => {
        // Create multiple sessions for user 1
        const session1 = createTestSession({
            id: SESSION_IDS.one,
            userId: USER_IDS.one,
            refreshTokenHash: `${TEST_PREFIX}-hash-1`,
            status: SessionStatus.Active,
        });
        const session2 = createTestSession({
            id: SESSION_IDS.two,
            userId: USER_IDS.one,
            refreshTokenHash: `${TEST_PREFIX}-hash-2`,
            status: SessionStatus.Active,
        });
        // Create a session for user 2 (should not be affected)
        const session3 = createTestSession({
            id: SESSION_IDS.three,
            userId: USER_IDS.two,
            refreshTokenHash: `${TEST_PREFIX}-hash-3`,
            status: SessionStatus.Active,
        });

        await sessionRepository.create(session1);
        await sessionRepository.create(session2);
        await sessionRepository.create(session3);

        // Revoke all sessions for user 1
        const revokeResult = await sessionRepository.revokeByUserId(USER_IDS.one);
        expect(revokeResult.success).toBe(true);

        // User 1 sessions should be revoked
        const find1 = await sessionRepository.findByRefreshTokenHash(`${TEST_PREFIX}-hash-1`);
        const find2 = await sessionRepository.findByRefreshTokenHash(`${TEST_PREFIX}-hash-2`);

        expect(find1.success).toBe(true);
        expect(find2.success).toBe(true);
        if (find1.success && find1.value) {
            expect(find1.value.status).toBe(SessionStatus.Revoked);
        }
        if (find2.success && find2.value) {
            expect(find2.value.status).toBe(SessionStatus.Revoked);
        }

        // User 2 session should still be active
        const find3 = await sessionRepository.findByRefreshTokenHash(`${TEST_PREFIX}-hash-3`);
        expect(find3.success).toBe(true);
        if (find3.success && find3.value) {
            expect(find3.value.status).toBe(SessionStatus.Active);
        }
    });

    it('does not revoke already revoked sessions', async () => {
        const revokedAt = new Date('2026-03-05T10:00:00.000Z');
        const session = createTestSession({
            id: SESSION_IDS.one,
            userId: USER_IDS.one,
            refreshTokenHash: `${TEST_PREFIX}-hash-1`,
            status: SessionStatus.Revoked,
            revokedAt,
            revokedBy: 'original-revoker',
        });

        await sessionRepository.create(session);

        // Try to revoke again
        const revokeResult = await sessionRepository.revokeByUserId(USER_IDS.one);
        expect(revokeResult.success).toBe(true);

        // Session should retain original revocation info
        const findResult = await sessionRepository.findByRefreshTokenHash(`${TEST_PREFIX}-hash-1`);
        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.status).toBe(SessionStatus.Revoked);
            expect(findResult.value.revokedBy).toBe('original-revoker');
        }
    });

    it('creates session with all optional fields', async () => {
        const revokedAt = new Date('2026-03-11T10:00:00.000Z');
        const session = createTestSession({
            id: SESSION_IDS.one,
            userId: USER_IDS.one,
            refreshTokenHash: `${TEST_PREFIX}-hash-full`,
            status: SessionStatus.Revoked,
            expiresAt: new Date('2026-04-15T10:00:00.000Z'),
            revokedAt,
            revokedBy: 'admin-user',
            ip: '10.0.0.1',
            userAgent: 'Chrome/120',
        });

        const createResult = await sessionRepository.create(session);
        expect(createResult.success).toBe(true);

        const findResult = await sessionRepository.findByRefreshTokenHash(`${TEST_PREFIX}-hash-full`);
        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.status).toBe(SessionStatus.Revoked);
            expect(findResult.value.revokedAt?.getTime()).toBe(revokedAt.getTime());
            expect(findResult.value.revokedBy).toBe('admin-user');
            expect(findResult.value.ip).toBe('10.0.0.1');
            expect(findResult.value.userAgent).toBe('Chrome/120');
        }
    });

    it('creates session without optional fields', async () => {
        const session = createTestSession({
            id: SESSION_IDS.one,
            userId: USER_IDS.one,
            refreshTokenHash: `${TEST_PREFIX}-hash-minimal`,
        });

        const createResult = await sessionRepository.create(session);
        expect(createResult.success).toBe(true);

        const findResult = await sessionRepository.findByRefreshTokenHash(`${TEST_PREFIX}-hash-minimal`);
        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.revokedAt).toBeUndefined();
            expect(findResult.value.revokedBy).toBeUndefined();
            expect(findResult.value.ip).toBeUndefined();
            expect(findResult.value.userAgent).toBeUndefined();
        }
    });
});
