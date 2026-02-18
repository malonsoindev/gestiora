import { describe, expect, it } from 'vitest';
import type { SessionRepository } from '@application/ports/session.repository.js';
import { Session, SessionStatus } from '@domain/entities/session.entity.js';
import { createTestSession, createSessionTestIds, SESSION_FIXED_NOW } from '@tests/shared/builders/session.builder.js';

/**
 * Context required to run the SessionRepository contract tests.
 */
export interface SessionRepositoryContractContext {
    /** Returns the repository instance to test */
    getRepository: () => SessionRepository;
    /** Unique prefix to avoid conflicts between test runs */
    testPrefix: string;
}

/**
 * Contract tests for SessionRepository implementations.
 * These tests verify that any implementation correctly fulfills the SessionRepository interface.
 */
export function sessionRepositoryContract(ctx: SessionRepositoryContractContext): void {
    const ids = createSessionTestIds(ctx.testPrefix);
    const USER_IDS = ids.users;
    const SESSION_IDS = ids.sessions;

    describe('SessionRepository Contract', () => {
        it('creates and retrieves a session by refresh token hash', async () => {
            const repository = ctx.getRepository();
            const session = createTestSession({
                id: SESSION_IDS.one,
                userId: USER_IDS.one,
                refreshTokenHash: `${ctx.testPrefix}-hash-1`,
                ip: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
            });

            const createResult = await repository.create(session);
            expect(createResult.success).toBe(true);

            const findResult = await repository.findByRefreshTokenHash(`${ctx.testPrefix}-hash-1`);

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
            const repository = ctx.getRepository();
            const findResult = await repository.findByRefreshTokenHash('non-existent-hash');

            expect(findResult.success).toBe(true);
            if (findResult.success) {
                expect(findResult.value).toBeNull();
            }
        });

        it('updates session status and refresh token hash', async () => {
            const repository = ctx.getRepository();
            const session = createTestSession({
                id: SESSION_IDS.one,
                userId: USER_IDS.one,
                refreshTokenHash: `${ctx.testPrefix}-hash-old`,
            });
            await repository.create(session);

            const revokedAt = new Date('2026-03-11T10:00:00.000Z');
            const updatedSession = Session.create({
                id: SESSION_IDS.one,
                userId: USER_IDS.one,
                refreshTokenHash: `${ctx.testPrefix}-hash-new`,
                status: SessionStatus.Revoked,
                createdAt: SESSION_FIXED_NOW,
                lastUsedAt: revokedAt,
                expiresAt: new Date('2026-04-10T10:00:00.000Z'),
                revokedAt,
                revokedBy: 'admin-user-id',
            });

            const updateResult = await repository.update(updatedSession);
            expect(updateResult.success).toBe(true);

            // Old hash should not find the session anymore
            const oldHashResult = await repository.findByRefreshTokenHash(`${ctx.testPrefix}-hash-old`);
            expect(oldHashResult.success).toBe(true);
            if (oldHashResult.success) {
                expect(oldHashResult.value).toBeNull();
            }

            // New hash should find the updated session
            const newHashResult = await repository.findByRefreshTokenHash(`${ctx.testPrefix}-hash-new`);
            expect(newHashResult.success).toBe(true);
            if (newHashResult.success) {
                expect(newHashResult.value?.status).toBe(SessionStatus.Revoked);
                expect(newHashResult.value?.revokedBy).toBe('admin-user-id');
                expect(newHashResult.value?.revokedAt).toBeDefined();
            }
        });

        it('revokes all active sessions for a user', async () => {
            const repository = ctx.getRepository();
            // Create multiple sessions for user 1
            const session1 = createTestSession({
                id: SESSION_IDS.one,
                userId: USER_IDS.one,
                refreshTokenHash: `${ctx.testPrefix}-hash-1`,
                status: SessionStatus.Active,
            });
            const session2 = createTestSession({
                id: SESSION_IDS.two,
                userId: USER_IDS.one,
                refreshTokenHash: `${ctx.testPrefix}-hash-2`,
                status: SessionStatus.Active,
            });
            // Create a session for user 2 (should not be affected)
            const session3 = createTestSession({
                id: SESSION_IDS.three,
                userId: USER_IDS.two,
                refreshTokenHash: `${ctx.testPrefix}-hash-3`,
                status: SessionStatus.Active,
            });

            await repository.create(session1);
            await repository.create(session2);
            await repository.create(session3);

            // Revoke all sessions for user 1
            const revokeResult = await repository.revokeByUserId(USER_IDS.one);
            expect(revokeResult.success).toBe(true);

            // User 1 sessions should be revoked
            const find1 = await repository.findByRefreshTokenHash(`${ctx.testPrefix}-hash-1`);
            const find2 = await repository.findByRefreshTokenHash(`${ctx.testPrefix}-hash-2`);

            expect(find1.success).toBe(true);
            expect(find2.success).toBe(true);
            if (find1.success && find1.value) {
                expect(find1.value.status).toBe(SessionStatus.Revoked);
            }
            if (find2.success && find2.value) {
                expect(find2.value.status).toBe(SessionStatus.Revoked);
            }

            // User 2 session should still be active
            const find3 = await repository.findByRefreshTokenHash(`${ctx.testPrefix}-hash-3`);
            expect(find3.success).toBe(true);
            if (find3.success && find3.value) {
                expect(find3.value.status).toBe(SessionStatus.Active);
            }
        });

        it('creates session with all optional fields', async () => {
            const repository = ctx.getRepository();
            const revokedAt = new Date('2026-03-11T10:00:00.000Z');
            const session = createTestSession({
                id: SESSION_IDS.one,
                userId: USER_IDS.one,
                refreshTokenHash: `${ctx.testPrefix}-hash-full`,
                status: SessionStatus.Revoked,
                expiresAt: new Date('2026-04-15T10:00:00.000Z'),
                revokedAt,
                revokedBy: 'admin-user',
                ip: '10.0.0.1',
                userAgent: 'Chrome/120',
            });

            const createResult = await repository.create(session);
            expect(createResult.success).toBe(true);

            const findResult = await repository.findByRefreshTokenHash(`${ctx.testPrefix}-hash-full`);
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
            const repository = ctx.getRepository();
            const session = createTestSession({
                id: SESSION_IDS.one,
                userId: USER_IDS.one,
                refreshTokenHash: `${ctx.testPrefix}-hash-minimal`,
            });

            const createResult = await repository.create(session);
            expect(createResult.success).toBe(true);

            const findResult = await repository.findByRefreshTokenHash(`${ctx.testPrefix}-hash-minimal`);
            expect(findResult.success).toBe(true);
            if (findResult.success && findResult.value) {
                expect(findResult.value.revokedAt).toBeUndefined();
                expect(findResult.value.revokedBy).toBeUndefined();
                expect(findResult.value.ip).toBeUndefined();
                expect(findResult.value.userAgent).toBeUndefined();
            }
        });
    });
}
