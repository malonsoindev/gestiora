import { describe, expect, it } from 'vitest';
import type { LoginAttemptRepository } from '@application/ports/login-attempt.repository.js';

/**
 * Test data factory for LoginAttempt tests.
 */
export function createLoginAttemptTestData(prefix: string) {
    return {
        emails: {
            one: `${prefix}-1@example.com`,
            two: `${prefix}-2@example.com`,
        },
        ips: {
            one: '192.168.100.1',
            two: '192.168.100.2',
        },
    };
}

/**
 * Context required to run the LoginAttemptRepository contract tests.
 */
export interface LoginAttemptRepositoryContractContext {
    /** Returns the repository instance to test */
    getRepository: () => LoginAttemptRepository;
    /** Unique prefix to avoid conflicts between test runs */
    testPrefix: string;
}

type AttemptKey = { email: string; ip?: string };
type AttemptRecord = { key: AttemptKey; succeeded: boolean; timestamp: Date };

/**
 * Helper to record multiple attempts and verify the failed count.
 */
async function recordAndExpectCount(
    repository: LoginAttemptRepository,
    attempts: AttemptRecord[],
    countKey: AttemptKey,
    windowMinutes: number,
    expectedCount: number,
): Promise<void> {
    for (const attempt of attempts) {
        const result = await repository.recordAttempt(attempt.key, attempt.succeeded, attempt.timestamp);
        expect(result.success).toBe(true);
    }

    await expectFailedCount(repository, countKey, windowMinutes, expectedCount);
}

/**
 * Helper to verify the failed attempts count.
 */
async function expectFailedCount(
    repository: LoginAttemptRepository,
    key: AttemptKey,
    windowMinutes: number,
    expectedCount: number,
): Promise<void> {
    const countResult = await repository.countFailedAttempts(key, windowMinutes);
    expect(countResult.success).toBe(true);
    if (countResult.success) {
        expect(countResult.value).toBe(expectedCount);
    }
}

/**
 * Contract tests for LoginAttemptRepository implementations.
 * These tests verify that any implementation correctly fulfills the LoginAttemptRepository interface.
 */
export function loginAttemptRepositoryContract(ctx: LoginAttemptRepositoryContractContext): void {
    const testData = createLoginAttemptTestData(ctx.testPrefix);
    const TEST_EMAILS = testData.emails;
    const TEST_IPS = testData.ips;

    describe('LoginAttemptRepository Contract', () => {
        it('records a successful login attempt', async () => {
            const repository = ctx.getRepository();
            const timestamp = new Date();

            await recordAndExpectCount(
                repository,
                [{ key: { email: TEST_EMAILS.one, ip: TEST_IPS.one }, succeeded: true, timestamp }],
                { email: TEST_EMAILS.one, ip: TEST_IPS.one },
                60,
                0,
            );
        });

        it('records a failed login attempt', async () => {
            const repository = ctx.getRepository();
            const timestamp = new Date();

            await recordAndExpectCount(
                repository,
                [{ key: { email: TEST_EMAILS.one, ip: TEST_IPS.one }, succeeded: false, timestamp }],
                { email: TEST_EMAILS.one, ip: TEST_IPS.one },
                60,
                1,
            );
        });

        it('records attempt without IP', async () => {
            const repository = ctx.getRepository();
            const timestamp = new Date();

            await recordAndExpectCount(
                repository,
                [{ key: { email: TEST_EMAILS.one }, succeeded: false, timestamp }],
                { email: TEST_EMAILS.one },
                60,
                1,
            );
        });

        it('counts failed attempts within time window', async () => {
            const repository = ctx.getRepository();
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
            const key = { email: TEST_EMAILS.one, ip: TEST_IPS.one };

            await recordAndExpectCount(
                repository,
                [
                    { key, succeeded: false, timestamp: fiveMinutesAgo },
                    { key, succeeded: false, timestamp: fiveMinutesAgo },
                    { key, succeeded: false, timestamp: tenMinutesAgo },
                ],
                key,
                7,
                2,
            );
        });

        it('counts failed attempts within larger time window', async () => {
            const repository = ctx.getRepository();
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
            const key = { email: TEST_EMAILS.one, ip: TEST_IPS.one };

            await recordAndExpectCount(
                repository,
                [
                    { key, succeeded: false, timestamp: fiveMinutesAgo },
                    { key, succeeded: false, timestamp: fiveMinutesAgo },
                    { key, succeeded: false, timestamp: tenMinutesAgo },
                ],
                key,
                15,
                3,
            );
        });

        it('does not count successful attempts', async () => {
            const repository = ctx.getRepository();
            const now = new Date();
            const key = { email: TEST_EMAILS.one, ip: TEST_IPS.one };

            await recordAndExpectCount(
                repository,
                [
                    { key, succeeded: false, timestamp: now },
                    { key, succeeded: false, timestamp: now },
                    { key, succeeded: true, timestamp: now },
                ],
                key,
                60,
                2,
            );
        });

        it('filters by IP when provided', async () => {
            const repository = ctx.getRepository();
            const now = new Date();
            const keyIpOne = { email: TEST_EMAILS.one, ip: TEST_IPS.one };
            const keyIpTwo = { email: TEST_EMAILS.one, ip: TEST_IPS.two };

            await recordAndExpectCount(
                repository,
                [
                    { key: keyIpOne, succeeded: false, timestamp: now },
                    { key: keyIpOne, succeeded: false, timestamp: now },
                    { key: keyIpTwo, succeeded: false, timestamp: now },
                ],
                keyIpOne,
                60,
                2,
            );
        });

        it('counts all IPs when IP not provided in key', async () => {
            const repository = ctx.getRepository();
            const now = new Date();

            await recordAndExpectCount(
                repository,
                [
                    { key: { email: TEST_EMAILS.one, ip: TEST_IPS.one }, succeeded: false, timestamp: now },
                    { key: { email: TEST_EMAILS.one, ip: TEST_IPS.two }, succeeded: false, timestamp: now },
                    { key: { email: TEST_EMAILS.one }, succeeded: false, timestamp: now },
                ],
                { email: TEST_EMAILS.one },
                60,
                3,
            );
        });

        it('isolates counts by email', async () => {
            const repository = ctx.getRepository();
            const now = new Date();
            const keyEmailOne = { email: TEST_EMAILS.one, ip: TEST_IPS.one };
            const keyEmailTwo = { email: TEST_EMAILS.two, ip: TEST_IPS.one };

            await recordAndExpectCount(
                repository,
                [
                    { key: keyEmailOne, succeeded: false, timestamp: now },
                    { key: keyEmailOne, succeeded: false, timestamp: now },
                    { key: keyEmailTwo, succeeded: false, timestamp: now },
                ],
                keyEmailOne,
                60,
                2,
            );
        });

        it('returns zero when no failed attempts exist', async () => {
            const repository = ctx.getRepository();

            await expectFailedCount(
                repository,
                { email: TEST_EMAILS.one, ip: TEST_IPS.one },
                60,
                0,
            );
        });
    });
}
