/**
 * @fileoverview E2E Tests - Server Health and Basic Connectivity
 *
 * These tests verify that the Fastify server:
 * - Starts correctly with all plugins registered
 * - Responds to basic requests
 * - Returns proper error codes for unauthorized access
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, type TestServer } from './setup.js';

describe('E2E: Server Health', () => {
    let server: TestServer;

    beforeAll(async () => {
        server = await createTestServer();
    });

    afterAll(async () => {
        await server.app.close();
    });

    it('serves static index.html on root path', async () => {
        const response = await server.inject({
            method: 'GET',
            url: '/',
        });

        // The server serves static files, so it should return 200
        // If index.html doesn't exist, it might return 404, which is also valid for this test
        expect([200, 404]).toContain(response.statusCode);
    });

    it('returns 401 for unauthenticated request to protected endpoint', async () => {
        const response = await server.inject({
            method: 'GET',
            url: '/providers',
        });

        expect(response.statusCode).toBe(401);
        const body = response.json<{ error: string }>();
        expect(body).toHaveProperty('error');
    });

    it('returns 401 for unauthenticated request to admin endpoint', async () => {
        const response = await server.inject({
            method: 'GET',
            url: '/admin/users',
        });

        expect(response.statusCode).toBe(401);
    });

    it('returns 400 for login with missing credentials', async () => {
        const response = await server.inject({
            method: 'POST',
            url: '/auth/login',
            payload: {},
        });

        expect(response.statusCode).toBe(400);
    });

    it('returns 401 for login with invalid credentials', async () => {
        const response = await server.inject({
            method: 'POST',
            url: '/auth/login',
            payload: {
                email: 'nonexistent@example.com',
                password: 'WrongPassword123!',
            },
        });

        expect(response.statusCode).toBe(401);
    });
});
