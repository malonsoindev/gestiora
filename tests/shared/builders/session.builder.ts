import { Session, SessionStatus } from '@domain/entities/session.entity.js';

const FIXED_NOW = new Date('2026-03-10T10:00:00.000Z');
const DEFAULT_EXPIRES_AT = new Date('2026-04-10T10:00:00.000Z');

export interface SessionBuilderOverrides {
    id: string;
    userId: string;
    refreshTokenHash: string;
    status?: SessionStatus;
    expiresAt?: Date;
    revokedAt?: Date;
    revokedBy?: string;
    ip?: string;
    userAgent?: string;
    createdAt?: Date;
    lastUsedAt?: Date;
}

/**
 * Creates a test Session entity with sensible defaults.
 * Only id, userId, and refreshTokenHash are required; all other fields have default values.
 */
export function createTestSession(overrides: SessionBuilderOverrides): Session {
    const props: Parameters<typeof Session.create>[0] = {
        id: overrides.id,
        userId: overrides.userId,
        refreshTokenHash: overrides.refreshTokenHash,
        status: overrides.status ?? SessionStatus.Active,
        createdAt: overrides.createdAt ?? FIXED_NOW,
        lastUsedAt: overrides.lastUsedAt ?? FIXED_NOW,
        expiresAt: overrides.expiresAt ?? DEFAULT_EXPIRES_AT,
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
}

/**
 * Generates unique session test IDs with a given prefix.
 */
export function createSessionTestIds(prefix: string) {
    return {
        users: {
            one: `${prefix}-user-1`,
            two: `${prefix}-user-2`,
        },
        sessions: {
            one: `${prefix}-session-1`,
            two: `${prefix}-session-2`,
            three: `${prefix}-session-3`,
        },
    };
}

export { FIXED_NOW as SESSION_FIXED_NOW };
