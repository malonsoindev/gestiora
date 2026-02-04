import { readFile } from 'node:fs/promises';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestResult = {
    status: number;
    bodyText: string;
};

type Tokens = {
    accessToken: string;
    refreshToken: string;
};

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'AdminPass1!a';

const OPENAPI_PATH = new URL('../docs/openapi.yaml', import.meta.url);

const expectedEndpoints: Array<{ path: string; method: HttpMethod }> = [
    { path: '/auth/login', method: 'POST' },
    { path: '/auth/refresh', method: 'POST' },
    { path: '/auth/logout', method: 'POST' },
    { path: '/admin/ping', method: 'GET' },
    { path: '/admin/users', method: 'POST' },
    { path: '/admin/users', method: 'GET' },
    { path: '/admin/users/{userId}', method: 'GET' },
    { path: '/admin/users/{userId}', method: 'PUT' },
    { path: '/admin/users/{userId}', method: 'DELETE' },
    { path: '/admin/users/{userId}/status', method: 'PATCH' },
    { path: '/admin/users/{userId}/sessions/revoke', method: 'POST' },
    { path: '/users/me', method: 'PATCH' },
];

const assertOpenApiCoverage = async (): Promise<void> => {
    const specText = await readFile(OPENAPI_PATH, 'utf-8');
    const missing: string[] = [];

    for (const endpoint of expectedEndpoints) {
        const pathPattern = `\n  ${endpoint.path}:`;
        const hasPath = specText.includes(pathPattern);
        const methodPattern = `${pathPattern}\n    ${endpoint.method.toLowerCase()}:`;
        const hasMethod = specText.includes(methodPattern);

        if (!hasPath || !hasMethod) {
            missing.push(`${endpoint.method} ${endpoint.path}`);
        }
    }

    if (missing.length > 0) {
        console.log('OpenAPI missing or mismatched endpoints:');
        for (const item of missing) {
            console.log(`- ${item}`);
        }
    } else {
        console.log('OpenAPI endpoints coverage OK');
    }
};

const requestJson = async <T>(
    method: HttpMethod,
    path: string,
    body?: T,
    accessToken?: string,
): Promise<RequestResult> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const bodyText = await response.text();
    return { status: response.status, bodyText };
};

const parseJson = <T>(text: string): T | null => {
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
};

const logResult = (label: string, result: RequestResult): void => {
    const summary = result.bodyText ? result.bodyText : '[no body]';
    console.log(`${label} -> ${result.status} ${summary}`);
};

const login = async (email: string, password: string): Promise<Tokens> => {
    const result = await requestJson('POST', '/auth/login', { email, password });
    logResult('POST /auth/login', result);

    const payload = parseJson<{ accessToken: string; refreshToken: string }>(result.bodyText);
    if (!payload?.accessToken || !payload.refreshToken) {
        throw new Error('Login failed or token missing');
    }

    return payload;
};

const run = async (): Promise<void> => {
    await assertOpenApiCoverage();

    const adminTokens = await login(ADMIN_EMAIL, ADMIN_PASSWORD);

    const uniqueSuffix = Date.now().toString(36);
    const userEmail = `smoke-${uniqueSuffix}@example.com`;
    const userPassword = 'TestPass1!a';

    const createUserResult = await requestJson(
        'POST',
        '/admin/users',
        {
            email: userEmail,
            password: userPassword,
            roles: ['Usuario'],
            status: 'ACTIVE',
            name: 'Smoke User',
        },
        adminTokens.accessToken,
    );
    logResult('POST /admin/users', createUserResult);

    const createPayload = parseJson<{ userId: string }>(createUserResult.bodyText);
    if (!createPayload?.userId) {
        throw new Error('Create user failed or userId missing');
    }
    const createdUserId = createPayload.userId;

    const userTokens = await login(userEmail, userPassword);

    const updateOwnProfileResult = await requestJson(
        'PATCH',
        '/users/me',
        { name: 'Smoke Updated', avatar: 'https://example.com/avatar.png' },
        userTokens.accessToken,
    );
    logResult('PATCH /users/me', updateOwnProfileResult);

    const adminPingResult = await requestJson('GET', '/admin/ping', undefined, adminTokens.accessToken);
    logResult('GET /admin/ping', adminPingResult);

    const listUsersResult = await requestJson('GET', '/admin/users', undefined, adminTokens.accessToken);
    logResult('GET /admin/users', listUsersResult);

    const getUserResult = await requestJson(
        'GET',
        `/admin/users/${createdUserId}`,
        undefined,
        adminTokens.accessToken,
    );
    logResult('GET /admin/users/{userId}', getUserResult);

    const updateUserResult = await requestJson(
        'PUT',
        `/admin/users/${createdUserId}`,
        { roles: ['Usuario'], status: 'ACTIVE', name: 'Smoke Admin Update' },
        adminTokens.accessToken,
    );
    logResult('PUT /admin/users/{userId}', updateUserResult);

    const updateStatusResult = await requestJson(
        'PATCH',
        `/admin/users/${createdUserId}/status`,
        { status: 'INACTIVE' },
        adminTokens.accessToken,
    );
    logResult('PATCH /admin/users/{userId}/status', updateStatusResult);

    const revokeSessionsResult = await requestJson(
        'POST',
        `/admin/users/${createdUserId}/sessions/revoke`,
        undefined,
        adminTokens.accessToken,
    );
    logResult('POST /admin/users/{userId}/sessions/revoke', revokeSessionsResult);

    const deleteUserResult = await requestJson(
        'DELETE',
        `/admin/users/${createdUserId}`,
        undefined,
        adminTokens.accessToken,
    );
    logResult('DELETE /admin/users/{userId}', deleteUserResult);

    const refreshResult = await requestJson(
        'POST',
        '/auth/refresh',
        { refreshToken: adminTokens.refreshToken },
        adminTokens.accessToken,
    );
    logResult('POST /auth/refresh', refreshResult);

    const refreshPayload = parseJson<{ refreshToken: string }>(refreshResult.bodyText);
    if (!refreshPayload?.refreshToken) {
        throw new Error('Refresh failed or refreshToken missing');
    }

    const logoutResult = await requestJson(
        'POST',
        '/auth/logout',
        { refreshToken: refreshPayload.refreshToken },
        adminTokens.accessToken,
    );
    logResult('POST /auth/logout', logoutResult);
};

await run().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Smoke test failed: ${message}`);
    process.exit(1);
});
