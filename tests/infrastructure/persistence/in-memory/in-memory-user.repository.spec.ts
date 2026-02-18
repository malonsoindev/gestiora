import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryUserRepository } from '@infrastructure/persistence/in-memory/in-memory-user.repository.js';
import { userRepositoryContract } from '@tests/infrastructure/persistence/contracts/user-repository.contract.js';
import { createTestUser, createTestIds, createTestEmails } from '@tests/shared/builders/user.builder.js';

const TEST_PREFIX = 'user-repo-test';
const USER_IDS = createTestIds(TEST_PREFIX);
const TEST_EMAILS = createTestEmails(TEST_PREFIX);

describe('InMemoryUserRepository', () => {
    let repository: InMemoryUserRepository;

    beforeEach(() => {
        repository = new InMemoryUserRepository();
    });

    // Run all contract tests
    userRepositoryContract({
        getRepository: () => repository,
        testPrefix: TEST_PREFIX,
    });

    // Implementation-specific tests
    describe('InMemory-specific behavior', () => {
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
});
