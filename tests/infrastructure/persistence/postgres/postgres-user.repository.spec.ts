import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres/postgres-user.repository.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import { Email } from '@domain/value-objects/email.value-object.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { createPostgresTestContext } from '@tests/shared/helpers/postgres-test-context.js';

const describeIf = process.env.DATABASE_URL ? describe : describe.skip;
const fixedNow = new Date('2026-03-10T10:00:00.000Z');

// Use unique prefix to avoid conflicts with other integration tests and seed data
const TEST_PREFIX = 'user-repo-test';
const USER_IDS = {
    one: `${TEST_PREFIX}-1`,
    two: `${TEST_PREFIX}-2`,
    three: `${TEST_PREFIX}-3`,
};

// Unique emails for tests
const TEST_EMAILS = {
    one: `${TEST_PREFIX}-1@example.com`,
    two: `${TEST_PREFIX}-2@example.com`,
    three: `${TEST_PREFIX}-3@example.com`,
};

const createTestUser = (overrides: {
    id: string;
    email: string;
    status?: UserStatus;
    roles?: UserRole[];
    name?: string;
    avatar?: string;
    lockedUntil?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}): User => {
    // Build props object conditionally to satisfy exactOptionalPropertyTypes
    const props: Parameters<typeof User.create>[0] = {
        id: overrides.id,
        email: Email.create(overrides.email),
        passwordHash: 'hashed-password-test',
        status: overrides.status ?? UserStatus.Active,
        roles: overrides.roles ?? [UserRole.user()],
        createdAt: overrides.createdAt ?? fixedNow,
        updatedAt: overrides.updatedAt ?? fixedNow,
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
};

describeIf('PostgresUserRepository', () => {
    const ctx = createPostgresTestContext();
    let repository: PostgresUserRepository;

    beforeAll(async () => {
        await ctx.setup();
        
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
        
        repository = new PostgresUserRepository(ctx.sql);
    });

    beforeEach(async () => {
        await ctx.beginTransaction();
        
        // Clean up within the transaction
        await ctx.sql`delete from sessions`;
        await ctx.sql`delete from users`;
    });

    afterEach(async () => {
        await ctx.rollbackTransaction();
    });

    afterAll(async () => {
        await ctx.cleanup();
    });

    it('creates and retrieves a user by id', async () => {
        const user = createTestUser({
            id: USER_IDS.one,
            email: TEST_EMAILS.one,
        });

        const createResult = await repository.create(user);
        expect(createResult.success).toBe(true);

        const findResult = await repository.findById(user.id);

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value?.id).toBe(USER_IDS.one);
            expect(findResult.value?.email).toBe(TEST_EMAILS.one);
            expect(findResult.value?.status).toBe(UserStatus.Active);
            expect(findResult.value?.roles).toHaveLength(1);
            expect(findResult.value?.roles[0]?.getValue()).toBe('USER');
        }
    });

    it('returns null when user not found by id', async () => {
        const findResult = await repository.findById('non-existent-id');

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value).toBeNull();
        }
    });

    it('finds user by email', async () => {
        const user = createTestUser({
            id: USER_IDS.one,
            email: TEST_EMAILS.one,
        });

        await repository.create(user);

        const findResult = await repository.findByEmail(TEST_EMAILS.one);

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value?.id).toBe(USER_IDS.one);
            expect(findResult.value?.email).toBe(TEST_EMAILS.one);
        }
    });

    it('returns null when email not found', async () => {
        const findResult = await repository.findByEmail('nonexistent@example.com');

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value).toBeNull();
        }
    });

    it('updates an existing user', async () => {
        const user = createTestUser({
            id: USER_IDS.one,
            email: TEST_EMAILS.one,
            name: 'Original Name',
        });
        await repository.create(user);

        const updatedAt = new Date('2026-03-11T10:00:00.000Z');
        const updated = user.updateInfo({
            name: 'Updated Name',
            avatar: 'new-avatar.png',
            status: UserStatus.Inactive,
            updatedAt,
        });

        const updateResult = await repository.update(updated);
        const findResult = await repository.findById(user.id);

        expect(updateResult.success).toBe(true);
        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.name).toBe('Updated Name');
            expect(findResult.value.avatar).toBe('new-avatar.png');
            expect(findResult.value.status).toBe(UserStatus.Inactive);
        }
    });

    it('creates user with admin role', async () => {
        const user = createTestUser({
            id: USER_IDS.one,
            email: TEST_EMAILS.one,
            roles: [UserRole.admin()],
        });

        await repository.create(user);

        const findResult = await repository.findById(user.id);

        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.roles).toHaveLength(1);
            expect(findResult.value.roles[0]?.getValue()).toBe('ADMIN');
        }
    });

    it('creates user with multiple roles', async () => {
        const user = createTestUser({
            id: USER_IDS.one,
            email: TEST_EMAILS.one,
            roles: [UserRole.user(), UserRole.admin()],
        });

        await repository.create(user);

        const findResult = await repository.findById(user.id);

        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.roles).toHaveLength(2);
            const roleValues = findResult.value.roles.map((r) => r.getValue());
            expect(roleValues).toContain('USER');
            expect(roleValues).toContain('ADMIN');
        }
    });

    it('lists users with pagination', async () => {
        const user1 = createTestUser({
            id: USER_IDS.one,
            email: TEST_EMAILS.one,
            createdAt: fixedNow,
        });
        const user2 = createTestUser({
            id: USER_IDS.two,
            email: TEST_EMAILS.two,
            createdAt: new Date('2026-03-11T10:00:00.000Z'),
        });

        await repository.create(user1);
        await repository.create(user2);

        const listResult = await repository.list({
            page: 1,
            pageSize: 10,
        });

        expect(listResult.success).toBe(true);
        if (listResult.success) {
            expect(listResult.value.items).toHaveLength(2);
            expect(listResult.value.total).toBe(2);

            // Verify our test users are in the list
            const userIds = listResult.value.items.map((u) => u.id);
            expect(userIds).toContain(USER_IDS.one);
            expect(userIds).toContain(USER_IDS.two);
        }
    });

    it('lists users filtered by status', async () => {
        const activeUser = createTestUser({
            id: USER_IDS.one,
            email: TEST_EMAILS.one,
            status: UserStatus.Active,
        });
        const inactiveUser = createTestUser({
            id: USER_IDS.two,
            email: TEST_EMAILS.two,
            status: UserStatus.Inactive,
        });

        await repository.create(activeUser);
        await repository.create(inactiveUser);

        const listResult = await repository.list({
            page: 1,
            pageSize: 100,
            status: UserStatus.Inactive,
        });

        expect(listResult.success).toBe(true);
        if (listResult.success) {
            // All returned users should be inactive
            const allInactive = listResult.value.items.every((u) => u.status === UserStatus.Inactive);
            expect(allInactive).toBe(true);

            // Our inactive user should be in the list
            const userIds = listResult.value.items.map((u) => u.id);
            expect(userIds).toContain(USER_IDS.two);
        }
    });

    it('lists users filtered by role', async () => {
        const regularUser = createTestUser({
            id: USER_IDS.one,
            email: TEST_EMAILS.one,
            roles: [UserRole.user()],
        });
        const adminUser = createTestUser({
            id: USER_IDS.two,
            email: TEST_EMAILS.two,
            roles: [UserRole.admin()],
        });

        await repository.create(regularUser);
        await repository.create(adminUser);

        const listResult = await repository.list({
            page: 1,
            pageSize: 100,
            role: UserRole.admin(),
        });

        expect(listResult.success).toBe(true);
        if (listResult.success) {
            // All returned users should have admin role
            const allAdmins = listResult.value.items.every((u) =>
                u.roles.some((r) => r.getValue() === 'ADMIN')
            );
            expect(allAdmins).toBe(true);

            // Our admin user should be in the list
            const userIds = listResult.value.items.map((u) => u.id);
            expect(userIds).toContain(USER_IDS.two);
        }
    });

    it('handles user with lockedUntil field', async () => {
        const lockedUntil = new Date('2026-03-15T10:00:00.000Z');
        const user = createTestUser({
            id: USER_IDS.one,
            email: TEST_EMAILS.one,
            lockedUntil,
        });

        await repository.create(user);

        const findResult = await repository.findById(user.id);

        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.lockedUntil).toBeDefined();
            expect(findResult.value.lockedUntil?.getTime()).toBe(lockedUntil.getTime());
        }
    });

    it('updates user password hash', async () => {
        const user = createTestUser({
            id: USER_IDS.one,
            email: TEST_EMAILS.one,
        });
        await repository.create(user);

        const updatedAt = new Date('2026-03-11T10:00:00.000Z');
        const updated = user.updateInfo({
            passwordHash: 'new-password-hash',
            updatedAt,
        });

        const updateResult = await repository.update(updated);
        const findResult = await repository.findById(user.id);

        expect(updateResult.success).toBe(true);
        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.passwordHash).toBe('new-password-hash');
        }
    });
});
