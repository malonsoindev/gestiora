import { User, UserStatus } from '@domain/entities/user.entity.js';
import { Email } from '@domain/value-objects/email.value-object.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';

const FIXED_NOW = new Date('2026-03-10T10:00:00.000Z');

export interface UserBuilderOverrides {
    id: string;
    email: string;
    status?: UserStatus;
    roles?: UserRole[];
    name?: string;
    avatar?: string;
    lockedUntil?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    passwordHash?: string;
}

/**
 * Creates a test User entity with sensible defaults.
 * Only id and email are required; all other fields have default values.
 */
export function createTestUser(overrides: UserBuilderOverrides): User {
    // Build props object conditionally to satisfy exactOptionalPropertyTypes
    const props: Parameters<typeof User.create>[0] = {
        id: overrides.id,
        email: Email.create(overrides.email),
        passwordHash: overrides.passwordHash ?? 'hashed-password-test',
        status: overrides.status ?? UserStatus.Active,
        roles: overrides.roles ?? [UserRole.user()],
        createdAt: overrides.createdAt ?? FIXED_NOW,
        updatedAt: overrides.updatedAt ?? FIXED_NOW,
    };

    // Only add optional properties if they are defined
    if (overrides.name !== undefined) {
        props.name = overrides.name;
    }
    if (overrides.avatar !== undefined) {
        props.avatar = overrides.avatar;
    }
    if (overrides.lockedUntil !== undefined) {
        props.lockedUntil = overrides.lockedUntil;
    }

    return User.create(props);
}

/**
 * Generates unique test IDs with a given prefix.
 */
export function createTestIds(prefix: string) {
    return {
        one: `${prefix}-1`,
        two: `${prefix}-2`,
        three: `${prefix}-3`,
    };
}

/**
 * Generates unique test emails with a given prefix.
 */
export function createTestEmails(prefix: string) {
    return {
        one: `${prefix}-1@example.com`,
        two: `${prefix}-2@example.com`,
        three: `${prefix}-3@example.com`,
    };
}

export { FIXED_NOW };
