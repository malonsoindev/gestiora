/**
 * @fileoverview E2E Tests - Authentication Flow
 *
 * Tests the complete authentication lifecycle:
 * - Login with valid/invalid credentials
 * - Token refresh with valid/invalid tokens
 * - Logout and session invalidation
 * - Using refreshed tokens for authenticated requests
 *
 * Uses in-memory repositories with seeded test users:
 * - admin@example.com / AdminPass1!a (ADMIN role)
 * - user@example.com / UserPass1!a01 (USER role)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestServer, loginAs, authHeader, resetTestState, type TestServer } from './setup.js';

describe('E2E: Authentication Flow', () => {
    let server: TestServer;

    beforeAll(async () => {
        server = await createTestServer();
    });

    beforeEach(() => {
        // Reset login attempts to prevent rate limiting between tests
        resetTestState();
    });

    afterAll(async () => {
        await server.app.close();
    });

    describe('POST /auth/login', () => {
        it('returns tokens for valid admin credentials', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/auth/login',
                payload: {
                    email: 'admin@example.com',
                    password: 'AdminPass1!a',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                accessToken: string;
                refreshToken: string;
                expiresIn: number;
            }>();
            expect(body).toHaveProperty('accessToken');
            expect(body).toHaveProperty('refreshToken');
            expect(body).toHaveProperty('expiresIn');
            expect(typeof body.accessToken).toBe('string');
            expect(typeof body.refreshToken).toBe('string');
            expect(typeof body.expiresIn).toBe('number');
            expect(body.accessToken.length).toBeGreaterThan(0);
            expect(body.refreshToken.length).toBeGreaterThan(0);
        });

        it('returns tokens for valid user credentials', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/auth/login',
                payload: {
                    email: 'user@example.com',
                    password: 'UserPass1!a01',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                accessToken: string;
                refreshToken: string;
                expiresIn: number;
            }>();
            expect(body).toHaveProperty('accessToken');
            expect(body).toHaveProperty('refreshToken');
        });

        it('returns 401 for invalid email', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/auth/login',
                payload: {
                    email: 'nonexistent@example.com',
                    password: 'SomePassword123!',
                },
            });

            expect(response.statusCode).toBe(401);
            const body = response.json<{ error: string }>();
            expect(body).toHaveProperty('error');
        });

        it('returns 401 for invalid password', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/auth/login',
                payload: {
                    email: 'admin@example.com',
                    password: 'WrongPassword123!',
                },
            });

            expect(response.statusCode).toBe(401);
        });

        it('returns 400 for missing email', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/auth/login',
                payload: {
                    password: 'SomePassword123!',
                },
            });

            expect(response.statusCode).toBe(400);
        });

        it('returns 400 for missing password', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/auth/login',
                payload: {
                    email: 'admin@example.com',
                },
            });

            expect(response.statusCode).toBe(400);
        });

        it('returns 400 for invalid email format', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/auth/login',
                payload: {
                    email: 'not-an-email',
                    password: 'SomePassword123!',
                },
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe('POST /auth/refresh', () => {
        it('returns new access token with valid refresh token', async () => {
            // First login to get tokens
            const tokens = await loginAs(server.inject, 'admin@example.com', 'AdminPass1!a');
            expect(tokens).not.toBeNull();

            // Now refresh
            const response = await server.inject({
                method: 'POST',
                url: '/auth/refresh',
                headers: authHeader(tokens!.accessToken),
                payload: {
                    refreshToken: tokens!.refreshToken,
                },
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                accessToken: string;
                refreshToken?: string;
                expiresIn: number;
            }>();
            expect(body).toHaveProperty('accessToken');
            expect(body).toHaveProperty('expiresIn');
            expect(typeof body.accessToken).toBe('string');
            expect(body.accessToken.length).toBeGreaterThan(0);
        });

        it('new access token works for authenticated requests', async () => {
            // Login
            const tokens = await loginAs(server.inject, 'admin@example.com', 'AdminPass1!a');
            expect(tokens).not.toBeNull();

            // Refresh to get new token
            const refreshResponse = await server.inject({
                method: 'POST',
                url: '/auth/refresh',
                headers: authHeader(tokens!.accessToken),
                payload: {
                    refreshToken: tokens!.refreshToken,
                },
            });
            const newTokens = refreshResponse.json<{ accessToken: string }>();

            // Use new token to access protected resource
            const protectedResponse = await server.inject({
                method: 'GET',
                url: '/providers',
                headers: authHeader(newTokens.accessToken),
            });

            expect(protectedResponse.statusCode).toBe(200);
        });

        it('returns 401 for invalid refresh token', async () => {
            // Login to get a valid access token for the header
            const tokens = await loginAs(server.inject, 'admin@example.com', 'AdminPass1!a');
            expect(tokens).not.toBeNull();

            const response = await server.inject({
                method: 'POST',
                url: '/auth/refresh',
                headers: authHeader(tokens!.accessToken),
                payload: {
                    refreshToken: 'invalid-refresh-token',
                },
            });

            expect(response.statusCode).toBe(401);
        });

        it('returns 400 for missing refresh token in body', async () => {
            const tokens = await loginAs(server.inject, 'admin@example.com', 'AdminPass1!a');
            expect(tokens).not.toBeNull();

            const response = await server.inject({
                method: 'POST',
                url: '/auth/refresh',
                headers: authHeader(tokens!.accessToken),
                payload: {},
            });

            expect(response.statusCode).toBe(400);
        });

        it('returns 401 without authorization header', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/auth/refresh',
                payload: {
                    refreshToken: 'some-token',
                },
            });

            expect(response.statusCode).toBe(401);
        });
    });

    describe('POST /auth/logout', () => {
        it('returns 204 for successful logout', async () => {
            // Login first
            const tokens = await loginAs(server.inject, 'user@example.com', 'UserPass1!a01');
            expect(tokens).not.toBeNull();

            // Logout
            const response = await server.inject({
                method: 'POST',
                url: '/auth/logout',
                headers: authHeader(tokens!.accessToken),
                payload: {
                    refreshToken: tokens!.refreshToken,
                },
            });

            expect(response.statusCode).toBe(204);
        });

        it('refresh token is invalid after logout', async () => {
            // Login
            const tokens = await loginAs(server.inject, 'admin@example.com', 'AdminPass1!a');
            expect(tokens).not.toBeNull();

            // Logout
            await server.inject({
                method: 'POST',
                url: '/auth/logout',
                headers: authHeader(tokens!.accessToken),
                payload: {
                    refreshToken: tokens!.refreshToken,
                },
            });

            // Try to refresh with the invalidated token - need to login again to get new access token
            const newTokens = await loginAs(server.inject, 'admin@example.com', 'AdminPass1!a');
            expect(newTokens).not.toBeNull();

            const refreshResponse = await server.inject({
                method: 'POST',
                url: '/auth/refresh',
                headers: authHeader(newTokens!.accessToken),
                payload: {
                    refreshToken: tokens!.refreshToken, // Old invalidated refresh token
                },
            });

            expect(refreshResponse.statusCode).toBe(401);
        });

        it('returns 400 for missing refresh token', async () => {
            const tokens = await loginAs(server.inject, 'admin@example.com', 'AdminPass1!a');
            expect(tokens).not.toBeNull();

            const response = await server.inject({
                method: 'POST',
                url: '/auth/logout',
                headers: authHeader(tokens!.accessToken),
                payload: {},
            });

            expect(response.statusCode).toBe(400);
        });

        it('returns 401 without authorization header', async () => {
            const response = await server.inject({
                method: 'POST',
                url: '/auth/logout',
                payload: {
                    refreshToken: 'some-token',
                },
            });

            expect(response.statusCode).toBe(401);
        });

        it('logout is idempotent - can logout same session twice', async () => {
            // Login
            const tokens = await loginAs(server.inject, 'user@example.com', 'UserPass1!a01');
            expect(tokens).not.toBeNull();

            // First logout
            const firstResponse = await server.inject({
                method: 'POST',
                url: '/auth/logout',
                headers: authHeader(tokens!.accessToken),
                payload: {
                    refreshToken: tokens!.refreshToken,
                },
            });
            expect(firstResponse.statusCode).toBe(204);

            // Second logout with same token (should still succeed - idempotent)
            const secondResponse = await server.inject({
                method: 'POST',
                url: '/auth/logout',
                headers: authHeader(tokens!.accessToken),
                payload: {
                    refreshToken: tokens!.refreshToken,
                },
            });
            expect(secondResponse.statusCode).toBe(204);
        });
    });

    describe('Complete auth lifecycle', () => {
        it('login -> use token -> refresh -> use new token -> logout', async () => {
            // Step 1: Login
            const loginResponse = await server.inject({
                method: 'POST',
                url: '/auth/login',
                payload: {
                    email: 'admin@example.com',
                    password: 'AdminPass1!a',
                },
            });
            expect(loginResponse.statusCode).toBe(200);
            const initialTokens = loginResponse.json<{
                accessToken: string;
                refreshToken: string;
            }>();

            // Step 2: Use access token for protected endpoint
            const providersResponse = await server.inject({
                method: 'GET',
                url: '/providers',
                headers: authHeader(initialTokens.accessToken),
            });
            expect(providersResponse.statusCode).toBe(200);

            // Step 3: Refresh the token
            const refreshResponse = await server.inject({
                method: 'POST',
                url: '/auth/refresh',
                headers: authHeader(initialTokens.accessToken),
                payload: {
                    refreshToken: initialTokens.refreshToken,
                },
            });
            expect(refreshResponse.statusCode).toBe(200);
            const refreshedTokens = refreshResponse.json<{
                accessToken: string;
                refreshToken?: string;
            }>();

            // Step 4: Use the new access token
            const providersResponse2 = await server.inject({
                method: 'GET',
                url: '/providers',
                headers: authHeader(refreshedTokens.accessToken),
            });
            expect(providersResponse2.statusCode).toBe(200);

            // Step 5: Logout
            const logoutResponse = await server.inject({
                method: 'POST',
                url: '/auth/logout',
                headers: authHeader(refreshedTokens.accessToken),
                payload: {
                    refreshToken: refreshedTokens.refreshToken ?? initialTokens.refreshToken,
                },
            });
            expect(logoutResponse.statusCode).toBe(204);
        });

        it('admin can access admin-only endpoints', async () => {
            const tokens = await loginAs(server.inject, 'admin@example.com', 'AdminPass1!a');
            expect(tokens).not.toBeNull();

            const response = await server.inject({
                method: 'GET',
                url: '/admin/users',
                headers: authHeader(tokens!.accessToken),
            });

            expect(response.statusCode).toBe(200);
        });

        it('regular user cannot access admin endpoints', async () => {
            const tokens = await loginAs(server.inject, 'user@example.com', 'UserPass1!a01');
            expect(tokens).not.toBeNull();

            const response = await server.inject({
                method: 'GET',
                url: '/admin/users',
                headers: authHeader(tokens!.accessToken),
            });

            expect(response.statusCode).toBe(403);
        });
    });
});
