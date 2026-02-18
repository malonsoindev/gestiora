import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryLoginAttemptRepository } from '@infrastructure/persistence/in-memory/in-memory-login-attempt.repository.js';
import {
    loginAttemptRepositoryContract,
    createLoginAttemptTestData,
} from '@tests/infrastructure/persistence/contracts/login-attempt-repository.contract.js';

const TEST_PREFIX = 'login-attempt-test';
const testData = createLoginAttemptTestData(TEST_PREFIX);
const TEST_EMAILS = testData.emails;
const TEST_IPS = testData.ips;

describe('InMemoryLoginAttemptRepository', () => {
    let repository: InMemoryLoginAttemptRepository;

    beforeEach(() => {
        repository = new InMemoryLoginAttemptRepository();
    });

    // Run all contract tests
    loginAttemptRepositoryContract({
        getRepository: () => repository,
        testPrefix: TEST_PREFIX,
    });

    // Implementation-specific tests
    describe('InMemory-specific behavior', () => {
        it('clears all attempts when clear() is called', async () => {
            const now = new Date();

            // Record some attempts
            await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, now);
            await repository.recordAttempt({ email: TEST_EMAILS.two, ip: TEST_IPS.two }, false, now);

            // Verify they exist
            const beforeClear = await repository.countFailedAttempts({ email: TEST_EMAILS.one }, 60);
            expect(beforeClear.success && beforeClear.value).toBe(1);

            // Clear all attempts
            repository.clear();

            // Verify they're gone
            const afterClear1 = await repository.countFailedAttempts({ email: TEST_EMAILS.one }, 60);
            const afterClear2 = await repository.countFailedAttempts({ email: TEST_EMAILS.two }, 60);

            expect(afterClear1.success).toBe(true);
            expect(afterClear2.success).toBe(true);
            if (afterClear1.success) expect(afterClear1.value).toBe(0);
            if (afterClear2.success) expect(afterClear2.value).toBe(0);
        });
    });
});
