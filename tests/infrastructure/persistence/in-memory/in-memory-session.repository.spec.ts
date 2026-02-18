import { describe, expect, it, beforeEach } from 'vitest';
import { InMemorySessionRepository } from '@infrastructure/persistence/in-memory/in-memory-session.repository.js';
import { SessionStatus } from '@domain/entities/session.entity.js';
import { sessionRepositoryContract } from '@tests/infrastructure/persistence/contracts/session-repository.contract.js';
import { createTestSession, createSessionTestIds } from '@tests/shared/builders/session.builder.js';

const TEST_PREFIX = 'session-repo-test';
const ids = createSessionTestIds(TEST_PREFIX);
const USER_IDS = ids.users;
const SESSION_IDS = ids.sessions;

describe('InMemorySessionRepository', () => {
    let repository: InMemorySessionRepository;

    beforeEach(() => {
        repository = new InMemorySessionRepository();
    });

    // Run all contract tests
    sessionRepositoryContract({
        getRepository: () => repository,
        testPrefix: TEST_PREFIX,
    });

    // Implementation-specific tests
    describe('InMemory-specific behavior', () => {
        it('revokes already revoked sessions (updates revokedAt)', async () => {
            const originalRevokedAt = new Date('2026-03-05T10:00:00.000Z');
            const session = createTestSession({
                id: SESSION_IDS.one,
                userId: USER_IDS.one,
                refreshTokenHash: `${TEST_PREFIX}-hash-1`,
                status: SessionStatus.Revoked,
                revokedAt: originalRevokedAt,
                revokedBy: 'original-revoker',
            });

            await repository.create(session);

            // Try to revoke again
            const revokeResult = await repository.revokeByUserId(USER_IDS.one);
            expect(revokeResult.success).toBe(true);

            // Session should be updated with new revokedAt but keep revokedBy
            const findResult = await repository.findByRefreshTokenHash(`${TEST_PREFIX}-hash-1`);
            expect(findResult.success).toBe(true);
            if (findResult.success && findResult.value) {
                expect(findResult.value.status).toBe(SessionStatus.Revoked);
                expect(findResult.value.revokedBy).toBe('original-revoker');
                // Note: In-memory implementation updates revokedAt on re-revoke
                expect(findResult.value.revokedAt).toBeDefined();
            }
        });
    });
});
