import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '@infrastructure/persistence/in-memory/in-memory-user.repository.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import { Email } from '@domain/value-objects/email.value-object.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';

const fixedNow = new Date('2026-03-10T10:00:00.000Z');

const TEST_PREFIX = 'user-repo-test';
const USER_IDS = {
    one: `${TEST_PREFIX}-1`,
    two: `${TEST_PREFIX}-2`,
    three: `${TEST_PREFIX}-3`,
};

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
    const props: Parameters<typeof User.create>[0] = {
        id: overrides.id,
        email: Email.create(overrides.email),
        passwordHash: 'hashed-password-test',
        status: overrides.status ?? UserStatus.Active,
        roles: overrides.roles ?? [UserRole.user()],
        createdAt: overrides.createdAt ?? fixedNow,
        updatedAt: overrides.updatedAt ?? fixedNow,
    };

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

describe('InMemoryUserRepository', () => {
    let repository: InMemoryUserRepository;

    beforeEach(() => {
        repository = new InMemoryUserRepository();
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
            expect(listResult.value.items.length).toBe(2);
            expect(listResult.value.total).toBe(2);

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
            const allInactive = listResult.value.items.every((u) => u.status === UserStatus.Inactive);
            expect(allInactive).toBe(true);

            const userIds = listResult.value.items.map((u) => u.id);
            expect(userIds).toContain(USER_IDS.two);
            expect(userIds).not.toContain(USER_IDS.one);
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
            const allAdmins = listResult.value.items.every((u) =>
                u.roles.some((r) => r.getValue() === 'ADMIN')
            );
            expect(allAdmins).toBe(true);

            const userIds = listResult.value.items.map((u) => u.id);
            expect(userIds).toContain(USER_IDS.two);
            expect(userIds).not.toContain(USER_IDS.one);
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

    it('initializes with users passed to constructor', async () => {
        const initialUser = createTestUser({
            id: USER_IDS.one,
            email: TEST_EMAILS.one,
        });

        const repoWithUsers = new InMemoryUserRepository([initialUser]);

        const findResult = await repoWithUsers.findById(USER_IDS.one);

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value?.id).toBe(USER_IDS.one);
        }
    });

    it('paginates correctly', async () => {
        const user1 = createTestUser({ id: USER_IDS.one, email: TEST_EMAILS.one });
        const user2 = createTestUser({ id: USER_IDS.two, email: TEST_EMAILS.two });
        const user3 = createTestUser({ id: USER_IDS.three, email: TEST_EMAILS.three });

        await repository.create(user1);
        await repository.create(user2);
        await repository.create(user3);

        const page1Result = await repository.list({ page: 1, pageSize: 2 });
        const page2Result = await repository.list({ page: 2, pageSize: 2 });

        expect(page1Result.success).toBe(true);
        expect(page2Result.success).toBe(true);

        if (page1Result.success && page2Result.success) {
            expect(page1Result.value.items.length).toBe(2);
            expect(page1Result.value.total).toBe(3);

            expect(page2Result.value.items.length).toBe(1);
            expect(page2Result.value.total).toBe(3);
        }
    });
});
