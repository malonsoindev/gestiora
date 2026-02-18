import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PostgresLoginAttemptRepository } from '@infrastructure/persistence/postgres/postgres-login-attempt.repository.js';
import { createPostgresTestContext } from '@tests/shared/helpers/postgres-test-context.js';

const describeIf = process.env.DATABASE_URL ? describe : describe.skip;

// Use unique prefix to avoid conflicts with other integration tests
const TEST_PREFIX = 'login-attempt-test';
const TEST_EMAILS = {
    one: `${TEST_PREFIX}-1@example.com`,
    two: `${TEST_PREFIX}-2@example.com`,
};
const TEST_IPS = {
    one: '192.168.100.1',
    two: '192.168.100.2',
};

describeIf('PostgresLoginAttemptRepository', () => {
    const ctx = createPostgresTestContext();
    let repository: PostgresLoginAttemptRepository;

    beforeAll(async () => {
        await ctx.setup();
        
        await ctx.sql`
            create table if not exists login_attempts (
                id bigserial primary key,
                email text not null,
                ip text null,
                succeeded boolean not null,
                created_at timestamptz not null
            )
        `;
        
        repository = new PostgresLoginAttemptRepository(ctx.sql);
    });

    beforeEach(async () => {
        await ctx.beginTransaction();
        
        // Clean up within the transaction
        await ctx.sql`delete from login_attempts`;
    });

    afterEach(async () => {
        await ctx.rollbackTransaction();
    });

    afterAll(async () => {
        await ctx.cleanup();
    });

    it('records a successful login attempt', async () => {
        const timestamp = new Date();
        const result = await repository.recordAttempt(
            { email: TEST_EMAILS.one, ip: TEST_IPS.one },
            true,
            timestamp,
        );

        expect(result.success).toBe(true);

        // Verify it was recorded
        const rows = await ctx.sql`
            select * from login_attempts 
            where email = ${TEST_EMAILS.one} and succeeded = true
        `;
        expect(rows.length).toBe(1);
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
        const rows = await ctx.sql`
            select * from login_attempts 
            where email = ${TEST_EMAILS.one} and succeeded = false
        `;
        expect(rows.length).toBe(1);
    });

    it('records attempt without IP', async () => {
        const timestamp = new Date();
        const result = await repository.recordAttempt(
            { email: TEST_EMAILS.one },
            false,
            timestamp,
        );

        expect(result.success).toBe(true);

        // Verify IP is null
        const rows = await ctx.sql`
            select * from login_attempts 
            where email = ${TEST_EMAILS.one} and ip is null
        `;
        expect(rows.length).toBe(1);
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
});
