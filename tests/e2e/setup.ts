/**
 * @fileoverview E2E Test Setup - Shared utilities for end-to-end tests
 *
 * Provides helper functions for:
 * - Creating and managing test server instances
 * - Authentication helpers for obtaining tokens
 * - Common test utilities
 * - State reset between tests
 */

import type { FastifyInstance } from 'fastify';
import { buildServer } from '@infrastructure/delivery/http/server.js';
import { seedUsers, compositionRoot } from '@composition/index.js';
import { InMemoryLoginAttemptRepository } from '@infrastructure/persistence/in-memory/in-memory-login-attempt.repository.js';

export type TestServer = {
    app: FastifyInstance;
    inject: FastifyInstance['inject'];
};

/**
 * Resets test state between tests.
 * Clears login attempts to prevent rate limiting issues across tests.
 */
export const resetTestState = (): void => {
    const repo = compositionRoot.loginAttemptRepository;
    if (repo instanceof InMemoryLoginAttemptRepository) {
        repo.clear();
        // eslint-disable-next-line no-console
        console.log('[E2E Setup] Login attempts cleared');
    } else {
        // eslint-disable-next-line no-console
        console.log('[E2E Setup] Repository is not InMemoryLoginAttemptRepository, skip clear');
    }
};

/**
 * Creates a test server instance using Fastify's inject method.
 * This avoids the need for actual HTTP connections, making tests faster.
 * Also seeds test users for in-memory repositories.
 *
 * @returns TestServer with app instance and inject method
 */
export const createTestServer = async (): Promise<TestServer> => {
    // Reset any accumulated login attempts from previous test runs
    resetTestState();

    // Seed test users before creating the server
    // This is idempotent - only adds users if repository is in-memory and empty
    await seedUsers();

    const app = await buildServer();
    await app.ready();

    return {
        app,
        inject: app.inject.bind(app),
    };
};

/**
 * Helper to login and get an access token for authenticated requests.
 *
 * @param inject - Fastify inject method
 * @param email - User email
 * @param password - User password
 * @returns Access token string or null if login failed
 */
export const loginAs = async (
    inject: FastifyInstance['inject'],
    email: string,
    password: string,
): Promise<{ accessToken: string; refreshToken: string } | null> => {
    const response = await inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email, password },
    });

    if (response.statusCode !== 200) {
        return null;
    }

    const body = response.json<{ accessToken: string; refreshToken: string }>();
    return {
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
    };
};

/**
 * Creates authorization header object for authenticated requests.
 *
 * @param token - JWT access token
 * @returns Headers object with Authorization bearer token
 */
export const authHeader = (token: string): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
});
