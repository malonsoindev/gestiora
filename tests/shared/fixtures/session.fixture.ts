import { Session, SessionStatus } from '@domain/entities/session.entity.js';
import type { SessionProps } from '@domain/entities/session.entity.js';
import { fixedNow } from '@tests/shared/fixed-now.js';

type CreateSessionParams = {
    id: string;
    userId: string;
    refreshTokenHash: string;
    now?: Date;
    overrides?: Partial<Omit<SessionProps, 'id' | 'userId' | 'refreshTokenHash'>>;
};

/**
 * Creates a test session with sensible defaults.
 *
 * @example
 * ```typescript
 * // Minimal usage
 * const session = createTestSession({
 *     id: 'session-1',
 *     userId: 'user-1',
 *     refreshTokenHash: 'hash-1',
 * });
 *
 * // With overrides
 * const revokedSession = createTestSession({
 *     id: 'session-2',
 *     userId: 'user-1',
 *     refreshTokenHash: 'hash-2',
 *     overrides: {
 *         status: SessionStatus.Revoked,
 *         revokedAt: new Date('2026-03-11T10:00:00.000Z'),
 *         revokedBy: 'admin-user',
 *     },
 * });
 * ```
 */
export const createTestSession = ({
    id,
    userId,
    refreshTokenHash,
    now = fixedNow,
    overrides = {},
}: CreateSessionParams): Session => {
    const defaultExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    return Session.create({
        id,
        userId,
        refreshTokenHash,
        status: SessionStatus.Active,
        createdAt: now,
        lastUsedAt: now,
        expiresAt: defaultExpiresAt,
        ...overrides,
    });
};

/**
 * Constants for test session IDs to avoid conflicts between tests.
 * Use with a test-specific prefix for isolation.
 */
export const SESSION_TEST_IDS = {
    one: 'session-1',
    two: 'session-2',
    three: 'session-3',
} as const;
