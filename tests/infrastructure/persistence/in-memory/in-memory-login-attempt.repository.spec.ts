import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryLoginAttemptRepository } from '@infrastructure/persistence/in-memory/in-memory-login-attempt.repository.js';

const TEST_PREFIX = 'login-attempt-test';
const TEST_EMAILS = {
    one: `${TEST_PREFIX}-1@example.com`,
    two: `${TEST_PREFIX}-2@example.com`,
};
const TEST_IPS = {
    one: '192.168.100.1',
    two: '192.168.100.2',
};

describe('InMemoryLoginAttemptRepository', () => {
    let repository: InMemoryLoginAttemptRepository;

    beforeEach(() => {
        repository = new InMemoryLoginAttemptRepository();
    });

    it('records a successful login attempt', async () => {
        const timestamp = new Date();
        const result = await repository.recordAttempt(
            { email: TEST_EMAILS.one, ip: TEST_IPS.one },
            true,
            timestamp,
        );

        expect(result.success).toBe(true);

        // Verify successful attempts are not counted as failed
        const countResult = await repository.countFailedAttempts(
            { email: TEST_EMAILS.one, ip: TEST_IPS.one },
            60,
        );
        expect(countResult.success).toBe(true);
        if (countResult.success) {
            expect(countResult.value).toBe(0);
        }
    });

    it('records a failed login attempt', async () => {
        const timestamp = new Date();
        const result = await repository.recordAttempt(
            { email: TEST_EMAILS.one, ip: TEST_IPS.one },
            false,
            timestamp,
        );

        expect(result.success).toBe(true);

        // Verify it was recorded
        const countResult = await repository.countFailedAttempts(
            { email: TEST_EMAILS.one, ip: TEST_IPS.one },
            60,
        );
        expect(countResult.success).toBe(true);
        if (countResult.success) {
            expect(countResult.value).toBe(1);
        }
    });

    it('records attempt without IP', async () => {
        const timestamp = new Date();
        const result = await repository.recordAttempt(
            { email: TEST_EMAILS.one },
            false,
            timestamp,
        );

        expect(result.success).toBe(true);

        // Count without IP filter should find it
        const countResult = await repository.countFailedAttempts(
            { email: TEST_EMAILS.one },
            60,
        );
        expect(countResult.success).toBe(true);
        if (countResult.success) {
            expect(countResult.value).toBe(1);
        }
    });

    it('counts failed attempts within time window', async () => {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

        // Record 3 failed attempts at different times
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, fiveMinutesAgo);
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, fiveMinutesAgo);
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, tenMinutesAgo);

        // Count within 7-minute window (should find 2)
        const countResult = await repository.countFailedAttempts(
            { email: TEST_EMAILS.one, ip: TEST_IPS.one },
            7,
        );

        expect(countResult.success).toBe(true);
        if (countResult.success) {
            expect(countResult.value).toBe(2);
        }
    });

    it('counts failed attempts within larger time window', async () => {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

        // Record 3 failed attempts
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, fiveMinutesAgo);
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, fiveMinutesAgo);
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, tenMinutesAgo);

        // Count within 15-minute window (should find all 3)
        const countResult = await repository.countFailedAttempts(
            { email: TEST_EMAILS.one, ip: TEST_IPS.one },
            15,
        );

        expect(countResult.success).toBe(true);
        if (countResult.success) {
            expect(countResult.value).toBe(3);
        }
    });

    it('does not count successful attempts', async () => {
        const now = new Date();

        // Record 2 failed and 1 successful
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, now);
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, now);
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, true, now);

        const countResult = await repository.countFailedAttempts(
            { email: TEST_EMAILS.one, ip: TEST_IPS.one },
            60,
        );

        expect(countResult.success).toBe(true);
        if (countResult.success) {
            expect(countResult.value).toBe(2); // Only failed attempts
        }
    });

    it('filters by IP when provided', async () => {
        const now = new Date();

        // Record failed attempts from different IPs
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, now);
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, now);
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.two }, false, now);

        // Count for IP one only
        const countResult = await repository.countFailedAttempts(
            { email: TEST_EMAILS.one, ip: TEST_IPS.one },
            60,
        );

        expect(countResult.success).toBe(true);
        if (countResult.success) {
            expect(countResult.value).toBe(2);
        }
    });

    it('counts all IPs when IP not provided in key', async () => {
        const now = new Date();

        // Record failed attempts from different IPs
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, now);
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.two }, false, now);
        await repository.recordAttempt({ email: TEST_EMAILS.one }, false, now); // No IP

        // Count without IP filter (should count all)
        const countResult = await repository.countFailedAttempts(
            { email: TEST_EMAILS.one },
            60,
        );

        expect(countResult.success).toBe(true);
        if (countResult.success) {
            expect(countResult.value).toBe(3);
        }
    });

    it('isolates counts by email', async () => {
        const now = new Date();

        // Record attempts for different emails
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, now);
        await repository.recordAttempt({ email: TEST_EMAILS.one, ip: TEST_IPS.one }, false, now);
        await repository.recordAttempt({ email: TEST_EMAILS.two, ip: TEST_IPS.one }, false, now);

        // Count for email one only
        const countResult = await repository.countFailedAttempts(
            { email: TEST_EMAILS.one, ip: TEST_IPS.one },
            60,
        );

        expect(countResult.success).toBe(true);
        if (countResult.success) {
            expect(countResult.value).toBe(2);
        }
    });

    it('returns zero when no failed attempts exist', async () => {
        const countResult = await repository.countFailedAttempts(
            { email: TEST_EMAILS.one, ip: TEST_IPS.one },
            60,
        );

        expect(countResult.success).toBe(true);
        if (countResult.success) {
            expect(countResult.value).toBe(0);
        }
    });

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
