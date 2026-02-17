import { User, UserStatus } from '@domain/entities/user.entity.js';
import type { UserProps } from '@domain/entities/user.entity.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { Email } from '@domain/value-objects/email.value-object.js';
import { fixedNow } from '@tests/shared/fixed-now.js';

type CreateUserParams = {
    id?: string;
    email?: string;
    now?: Date;
    overrides?: Partial<UserProps>;
};

const DEFAULT_PASSWORD_HASH = 'hashed-password-test';

/**
 * Creates a test user with sensible defaults.
 *
 * @example
 * ```typescript
 * // Minimal usage - generates default id/email
 * const user = createTestUser({ now: fixedNow });
 *
 * // With specific id and email (for repository tests)
 * const user = createTestUser({
 *     id: 'user-1',
 *     email: 'test@example.com',
 * });
 *
 * // With overrides (legacy style - still supported)
 * const adminUser = createTestUser({
 *     now: fixedNow,
 *     overrides: {
 *         id: 'admin-1',
 *         roles: [UserRole.admin()],
 *         status: UserStatus.Inactive,
 *         name: 'Admin User',
 *     },
 * });
 * ```
 */
export const createTestUser = ({
    id,
    email,
    now = fixedNow,
    overrides = {},
}: CreateUserParams = {}): User => {
    // Priority: overrides.id > id parameter > default
    const finalId = overrides.id ?? id ?? 'user-1';

    // Priority: overrides.email > email parameter > default
    // overrides.email is an Email object, email parameter is a string
    const finalEmail = overrides.email ?? Email.create(email ?? 'user@example.com');

    // Destructure to separate id/email from other overrides
    const { id: _id, email: _email, ...restOverrides } = overrides;

    return User.create({
        id: finalId,
        email: finalEmail,
        passwordHash: DEFAULT_PASSWORD_HASH,
        status: UserStatus.Active,
        roles: [UserRole.user()],
        createdAt: now,
        updatedAt: now,
        ...restOverrides,
    });
};

/**
 * Constants for test user IDs to avoid conflicts between tests.
 * Use with a test-specific prefix for isolation.
 */
export const USER_TEST_IDS = {
    one: 'user-1',
    two: 'user-2',
    three: 'user-3',
} as const;

/**
 * Constants for test user emails.
 * Use with a test-specific prefix for isolation.
 */
export const USER_TEST_EMAILS = {
    one: 'user-1@example.com',
    two: 'user-2@example.com',
    three: 'user-3@example.com',
} as const;
