import { describe, expect, it } from 'vitest';
import type { UserRepository } from '@application/ports/user.repository.js';
import { UserStatus } from '@domain/entities/user.entity.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { createTestUser, createTestIds, createTestEmails, FIXED_NOW } from '@tests/shared/builders/user.builder.js';

/**
 * Context required to run the UserRepository contract tests.
 */
export interface UserRepositoryContractContext {
    /** Returns the repository instance to test */
    getRepository: () => UserRepository;
    /** Unique prefix to avoid conflicts between test runs */
    testPrefix: string;
}

/**
 * Contract tests for UserRepository implementations.
 * These tests verify that any implementation correctly fulfills the UserRepository interface.
 *
 * Usage:
 * ```ts
 * userRepositoryContract({
 *   getRepository: () => repository,
 *   testPrefix: 'postgres-user-test',
 * });
 * ```
 */
export function userRepositoryContract(ctx: UserRepositoryContractContext): void {
    const USER_IDS = createTestIds(ctx.testPrefix);
    const TEST_EMAILS = createTestEmails(ctx.testPrefix);

    describe('UserRepository Contract', () => {
        it('creates and retrieves a user by id', async () => {
            const repository = ctx.getRepository();
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
            const repository = ctx.getRepository();
            const findResult = await repository.findById('non-existent-id');

            expect(findResult.success).toBe(true);
            if (findResult.success) {
                expect(findResult.value).toBeNull();
            }
        });

        it('finds user by email', async () => {
            const repository = ctx.getRepository();
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
            const repository = ctx.getRepository();
            const findResult = await repository.findByEmail('nonexistent@example.com');

            expect(findResult.success).toBe(true);
            if (findResult.success) {
                expect(findResult.value).toBeNull();
            }
        });

        it('updates an existing user', async () => {
            const repository = ctx.getRepository();
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
            const repository = ctx.getRepository();
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
            const repository = ctx.getRepository();
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
            const repository = ctx.getRepository();
            const user1 = createTestUser({
                id: USER_IDS.one,
                email: TEST_EMAILS.one,
                createdAt: FIXED_NOW,
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
                expect(listResult.value.items.length).toBeGreaterThanOrEqual(2);
                expect(listResult.value.total).toBeGreaterThanOrEqual(2);

                // Verify our test users are in the list
                const userIds = listResult.value.items.map((u) => u.id);
                expect(userIds).toContain(USER_IDS.one);
                expect(userIds).toContain(USER_IDS.two);
            }
        });

        it('lists users filtered by status', async () => {
            const repository = ctx.getRepository();
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
            const repository = ctx.getRepository();
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
            const repository = ctx.getRepository();
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
            const repository = ctx.getRepository();
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
}
