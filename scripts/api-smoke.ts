/**
 * @fileoverview API Smoke Test - Evaluacion completa de todos los endpoints
 *
 * Ejecuta pruebas de humo contra todos los 34 endpoints de la API de Gestiora.
 * Muestra por pantalla cada peticion realizada y su resultado de forma visual.
 *
 * @example
 * npx tsx scripts/api-smoke.ts
 *
 * Variables de entorno opcionales:
 * - BASE_URL: URL base del servidor (default: http://localhost:3000)
 * - ADMIN_EMAIL: Email del administrador (default: admin@example.com)
 * - ADMIN_PASSWORD: Password del administrador (default: AdminPass1!a)
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// TIPOS
// ============================================================================

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestResult = {
    status: number;
    statusText: string;
    body: unknown;
    duration: number;
};

type Tokens = {
    accessToken: string;
    refreshToken: string;
};

type TestResult = {
    endpoint: string;
    method: HttpMethod;
    status: number;
    success: boolean;
    duration: number;
    error?: string | undefined;
};

// ============================================================================
// CONFIGURACION
// ============================================================================

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'AdminPass1!a';
const USER_EMAIL = process.env.USER_EMAIL ?? 'user@example.com';
const USER_PASSWORD = process.env.USER_PASSWORD ?? 'UserPass1!a';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DEMO_DIR = join(__dirname, '..', 'demo');

// ============================================================================
// COLORES Y FORMATEO
// ============================================================================

const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    bgGreen: '\x1b[42m',
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
};

const methodColors: Record<HttpMethod, string> = {
    GET: colors.green,
    POST: colors.yellow,
    PUT: colors.blue,
    PATCH: colors.magenta,
    DELETE: colors.red,
};

const formatMethod = (method: HttpMethod): string => {
    const color = methodColors[method];
    return `${color}${method.padEnd(6)}${colors.reset}`;
};

const formatStatus = (status: number): string => {
    if (status >= 200 && status < 300) {
        return `${colors.green}${status}${colors.reset}`;
    }
    if (status >= 400 && status < 500) {
        return `${colors.yellow}${status}${colors.reset}`;
    }
    if (status >= 500) {
        return `${colors.red}${status}${colors.reset}`;
    }
    return `${colors.cyan}${status}${colors.reset}`;
};

const formatDuration = (ms: number): string => {
    if (ms < 100) {
        return `${colors.green}${ms}ms${colors.reset}`;
    }
    if (ms < 500) {
        return `${colors.yellow}${ms}ms${colors.reset}`;
    }
    return `${colors.red}${ms}ms${colors.reset}`;
};

const formatSuccess = (success: boolean): string => {
    return success
        ? `${colors.bgGreen}${colors.white} PASS ${colors.reset}`
        : `${colors.bgRed}${colors.white} FAIL ${colors.reset}`;
};

const printHeader = (title: string): void => {
    const line = '='.repeat(70);
    console.log(`\n${colors.cyan}${line}${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}  ${title}${colors.reset}`);
    console.log(`${colors.cyan}${line}${colors.reset}\n`);
};

const printSection = (title: string): void => {
    console.log(`\n${colors.bold}${colors.blue}>> ${title}${colors.reset}`);
    console.log(`${colors.dim}${'─'.repeat(50)}${colors.reset}`);
};

const printRequest = (method: HttpMethod, path: string, body?: unknown): void => {
    console.log(`\n${colors.dim}┌─ Request ────────────────────────────────────────${colors.reset}`);
    console.log(`${colors.dim}│${colors.reset} ${formatMethod(method)} ${colors.white}${path}${colors.reset}`);
    if (body) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
        const lines = bodyStr.split('\n');
        for (const line of lines.slice(0, 5)) {
            console.log(`${colors.dim}│${colors.reset} ${colors.dim}${line}${colors.reset}`);
        }
        if (lines.length > 5) {
            console.log(`${colors.dim}│${colors.reset} ${colors.dim}... (${lines.length - 5} more lines)${colors.reset}`);
        }
    }
};

const printResponse = (result: RequestResult): void => {
    console.log(`${colors.dim}├─ Response ───────────────────────────────────────${colors.reset}`);
    console.log(`${colors.dim}│${colors.reset} Status: ${formatStatus(result.status)} ${result.statusText}`);
    console.log(`${colors.dim}│${colors.reset} Time:   ${formatDuration(result.duration)}`);
    
    if (result.body) {
        const bodyStr = typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2);
        const lines = bodyStr.split('\n');
        console.log(`${colors.dim}│${colors.reset} Body:`);
        for (const line of lines.slice(0, 8)) {
            console.log(`${colors.dim}│${colors.reset}   ${colors.dim}${line}${colors.reset}`);
        }
        if (lines.length > 8) {
            console.log(`${colors.dim}│${colors.reset}   ${colors.dim}... (${lines.length - 8} more lines)${colors.reset}`);
        }
    }
    console.log(`${colors.dim}└──────────────────────────────────────────────────${colors.reset}`);
};

// ============================================================================
// HTTP CLIENT
// ============================================================================

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

    const requestInit: RequestInit = { method, headers };
    if (body) {
        requestInit.body = JSON.stringify(body);
    }

    printRequest(method, path, body);

    const start = Date.now();
    const response = await fetch(`${BASE_URL}${path}`, requestInit);
    const duration = Date.now() - start;

    const bodyText = await response.text();
    let parsedBody: unknown = bodyText;
    try {
        parsedBody = JSON.parse(bodyText);
    } catch {
        // Keep as text
    }

    const result: RequestResult = {
        status: response.status,
        statusText: response.statusText,
        body: parsedBody,
        duration,
    };

    printResponse(result);
    return result;
};

const requestMultipart = async (
    method: HttpMethod,
    path: string,
    filePath: string,
    accessToken: string,
): Promise<RequestResult> => {
    const fileContent = await readFile(filePath);
    const fileName = filePath.split(/[/\\]/).pop() ?? 'file.pdf';
    
    const formData = new FormData();
    formData.append('file', new Blob([fileContent], { type: 'application/pdf' }), fileName);

    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
    };

    printRequest(method, path, `[File: ${fileName}]`);

    const start = Date.now();
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: formData,
    });
    const duration = Date.now() - start;

    const bodyText = await response.text();
    let parsedBody: unknown = bodyText;
    try {
        parsedBody = JSON.parse(bodyText);
    } catch {
        // Keep as text
    }

    const result: RequestResult = {
        status: response.status,
        statusText: response.statusText,
        body: parsedBody,
        duration,
    };

    printResponse(result);
    return result;
};

// ============================================================================
// HELPERS
// ============================================================================

const parseJson = <T>(body: unknown): T | null => {
    if (typeof body === 'object' && body !== null) {
        return body as T;
    }
    return null;
};

const isSuccess = (status: number): boolean => status >= 200 && status < 300;

// ============================================================================
// TEST RUNNER
// ============================================================================

const results: TestResult[] = [];

const recordResult = (
    method: HttpMethod,
    endpoint: string,
    status: number,
    duration: number,
    error?: string,
): void => {
    results.push({
        method,
        endpoint,
        status,
        success: isSuccess(status),
        duration,
        error,
    });
};

const run = async (): Promise<void> => {
    printHeader('GESTIORA API SMOKE TEST');
    console.log(`${colors.dim}Base URL: ${BASE_URL}${colors.reset}`);
    console.log(`${colors.dim}Admin:    ${ADMIN_EMAIL}${colors.reset}`);
    console.log(`${colors.dim}Demo Dir: ${DEMO_DIR}${colors.reset}`);

    // ========================================================================
    // 1. AUTH - Login Admin
    // ========================================================================
    printSection('1. AUTH - Login Admin');

    const loginAdminResult = await requestJson('POST', '/auth/login', {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
    });
    recordResult('POST', '/auth/login (admin)', loginAdminResult.status, loginAdminResult.duration);

    const adminTokens = parseJson<Tokens>(loginAdminResult.body);
    if (!adminTokens?.accessToken) {
        throw new Error('Admin login failed');
    }

    // ========================================================================
    // 2. AUTH - Login User
    // ========================================================================
    printSection('2. AUTH - Login User');

    const loginUserResult = await requestJson('POST', '/auth/login', {
        email: USER_EMAIL,
        password: USER_PASSWORD,
    });
    recordResult('POST', '/auth/login (user)', loginUserResult.status, loginUserResult.duration);

    const userTokens = parseJson<Tokens>(loginUserResult.body);
    if (!userTokens?.accessToken) {
        console.log(`${colors.yellow}Warning: User login failed, some tests will be skipped${colors.reset}`);
    }

    // ========================================================================
    // 3. ADMIN - Ping
    // ========================================================================
    printSection('3. ADMIN - Ping');

    const pingResult = await requestJson('GET', '/admin/ping', undefined, adminTokens.accessToken);
    recordResult('GET', '/admin/ping', pingResult.status, pingResult.duration);

    // ========================================================================
    // 4. ADMIN USERS - CRUD
    // ========================================================================
    printSection('4. ADMIN USERS - Create');

    const uniqueSuffix = Date.now().toString(36);
    const testUserEmail = `smoke-${uniqueSuffix}@example.com`;

    const createUserResult = await requestJson(
        'POST',
        '/admin/users',
        {
            email: testUserEmail,
            password: 'TestPass1!aa',
            roles: ['Usuario'],
            status: 'ACTIVE',
            name: 'Smoke Test User',
        },
        adminTokens.accessToken,
    );
    recordResult('POST', '/admin/users', createUserResult.status, createUserResult.duration);

    const createdUser = parseJson<{ userId: string }>(createUserResult.body);
    const testUserId = createdUser?.userId ?? 'user-unknown';

    printSection('4. ADMIN USERS - List');

    const listUsersResult = await requestJson(
        'GET',
        '/admin/users?page=1&pageSize=10',
        undefined,
        adminTokens.accessToken,
    );
    recordResult('GET', '/admin/users', listUsersResult.status, listUsersResult.duration);

    printSection('4. ADMIN USERS - Get Detail');

    const getUserResult = await requestJson(
        'GET',
        `/admin/users/${testUserId}`,
        undefined,
        adminTokens.accessToken,
    );
    recordResult('GET', '/admin/users/{userId}', getUserResult.status, getUserResult.duration);

    printSection('4. ADMIN USERS - Update');

    const updateUserResult = await requestJson(
        'PUT',
        `/admin/users/${testUserId}`,
        {
            roles: ['Usuario'],
            status: 'ACTIVE',
            name: 'Smoke Updated User',
        },
        adminTokens.accessToken,
    );
    recordResult('PUT', '/admin/users/{userId}', updateUserResult.status, updateUserResult.duration);

    printSection('4. ADMIN USERS - Update Status');

    const updateStatusResult = await requestJson(
        'PATCH',
        `/admin/users/${testUserId}/status`,
        { status: 'INACTIVE' },
        adminTokens.accessToken,
    );
    recordResult('PATCH', '/admin/users/{userId}/status', updateStatusResult.status, updateStatusResult.duration);

    printSection('4. ADMIN USERS - Change Password');

    const changePasswordResult = await requestJson(
        'POST',
        `/admin/users/${testUserId}/password`,
        { newPassword: 'NewTestPass1!aa' },
        adminTokens.accessToken,
    );
    recordResult('POST', '/admin/users/{userId}/password', changePasswordResult.status, changePasswordResult.duration);

    printSection('4. ADMIN USERS - Revoke Sessions');

    const revokeSessionsResult = await requestJson(
        'POST',
        `/admin/users/${testUserId}/sessions/revoke`,
        undefined,
        adminTokens.accessToken,
    );
    recordResult('POST', '/admin/users/{userId}/sessions/revoke', revokeSessionsResult.status, revokeSessionsResult.duration);

    printSection('4. ADMIN USERS - Delete');

    const deleteUserResult = await requestJson(
        'DELETE',
        `/admin/users/${testUserId}`,
        undefined,
        adminTokens.accessToken,
    );
    recordResult('DELETE', '/admin/users/{userId}', deleteUserResult.status, deleteUserResult.duration);

    // ========================================================================
    // 5. USERS (SELF)
    // ========================================================================
    printSection('5. USERS (SELF) - Update Profile');

    if (userTokens?.accessToken) {
        const updateProfileResult = await requestJson(
            'PATCH',
            '/users/me',
            { name: 'Smoke Profile Update' },
            userTokens.accessToken,
        );
        recordResult('PATCH', '/users/me', updateProfileResult.status, updateProfileResult.duration);

        printSection('5. USERS (SELF) - Change Own Password');

        const changeOwnPasswordResult = await requestJson(
            'POST',
            '/users/me/password',
            {
                currentPassword: USER_PASSWORD,
                newPassword: 'UserPass1!aNew',
            },
            userTokens.accessToken,
        );
        recordResult('POST', '/users/me/password', changeOwnPasswordResult.status, changeOwnPasswordResult.duration);

        // Restore original password
        if (isSuccess(changeOwnPasswordResult.status)) {
            await requestJson(
                'POST',
                '/users/me/password',
                {
                    currentPassword: 'UserPass1!aNew',
                    newPassword: USER_PASSWORD,
                },
                userTokens.accessToken,
            );
        }
    }

    // ========================================================================
    // 6. PROVIDERS - CRUD
    // ========================================================================
    printSection('6. PROVIDERS - Create');

    const testCif = `B${Date.now().toString().slice(-8)}`;
    const createProviderResult = await requestJson(
        'POST',
        '/providers',
        {
            razonSocial: `Proveedor Smoke ${uniqueSuffix}`,
            cif: testCif,
            direccion: 'Calle Smoke 123',
            poblacion: 'Madrid',
            provincia: 'Madrid',
            pais: 'ES',
            status: 'ACTIVE',
        },
        adminTokens.accessToken,
    );
    recordResult('POST', '/providers', createProviderResult.status, createProviderResult.duration);

    const createdProvider = parseJson<{ providerId: string }>(createProviderResult.body);
    const testProviderId = createdProvider?.providerId ?? 'provider-1';

    printSection('6. PROVIDERS - List');

    const listProvidersResult = await requestJson(
        'GET',
        '/providers?page=1&pageSize=10',
        undefined,
        adminTokens.accessToken,
    );
    recordResult('GET', '/providers', listProvidersResult.status, listProvidersResult.duration);

    printSection('6. PROVIDERS - Get Detail');

    const getProviderResult = await requestJson(
        'GET',
        `/providers/${testProviderId}`,
        undefined,
        adminTokens.accessToken,
    );
    recordResult('GET', '/providers/{providerId}', getProviderResult.status, getProviderResult.duration);

    printSection('6. PROVIDERS - Update');

    const updateProviderResult = await requestJson(
        'PUT',
        `/providers/${testProviderId}`,
        {
            razonSocial: `Proveedor Smoke Updated ${uniqueSuffix}`,
            cif: testCif,
            direccion: 'Calle Smoke 456',
            poblacion: 'Barcelona',
            provincia: 'Barcelona',
            pais: 'ES',
            status: 'ACTIVE',
        },
        adminTokens.accessToken,
    );
    recordResult('PUT', '/providers/{providerId}', updateProviderResult.status, updateProviderResult.duration);

    printSection('6. PROVIDERS - Update Status');

    const updateProviderStatusResult = await requestJson(
        'PATCH',
        `/providers/${testProviderId}/status`,
        { status: 'INACTIVE' },
        adminTokens.accessToken,
    );
    recordResult('PATCH', '/providers/{providerId}/status', updateProviderStatusResult.status, updateProviderStatusResult.duration);

    // Re-activate for invoice tests
    await requestJson(
        'PATCH',
        `/providers/${testProviderId}/status`,
        { status: 'ACTIVE' },
        adminTokens.accessToken,
    );

    // ========================================================================
    // 7. DOCUMENTS - Manual Invoice
    // ========================================================================
    printSection('7. DOCUMENTS - Create Manual Invoice');

    const createInvoiceResult = await requestJson(
        'POST',
        '/documents/manual',
        {
            providerId: testProviderId,
            providerCif: testCif,
            invoice: {
                numeroFactura: `FAC-SMOKE-${uniqueSuffix}`,
                fechaOperacion: '2026-02-17',
                fechaVencimiento: '2026-03-17',
                baseImponible: 100,
                iva: 21,
                total: 121,
                movements: [
                    {
                        concepto: 'Servicio de prueba',
                        cantidad: 1,
                        precio: 100,
                        baseImponible: 100,
                        iva: 21,
                        total: 121,
                    },
                ],
            },
        },
        adminTokens.accessToken,
    );
    recordResult('POST', '/documents/manual', createInvoiceResult.status, createInvoiceResult.duration);

    const createdInvoice = parseJson<{ invoiceId: string }>(createInvoiceResult.body);
    const testInvoiceId = createdInvoice?.invoiceId ?? 'invoice-unknown';

    printSection('7. DOCUMENTS - List Invoices');

    const listInvoicesResult = await requestJson(
        'GET',
        '/documents?page=1&pageSize=10',
        undefined,
        adminTokens.accessToken,
    );
    recordResult('GET', '/documents', listInvoicesResult.status, listInvoicesResult.duration);

    printSection('7. DOCUMENTS - Get Invoice Detail');

    const getInvoiceResult = await requestJson(
        'GET',
        `/documents/${testInvoiceId}`,
        undefined,
        adminTokens.accessToken,
    );
    recordResult('GET', '/documents/{invoiceId}', getInvoiceResult.status, getInvoiceResult.duration);

    // Get movement ID for confirmation tests
    const invoiceDetail = parseJson<{ movements?: Array<{ id: string }> }>(getInvoiceResult.body);
    const testMovementId = invoiceDetail?.movements?.[0]?.id ?? 'movement-unknown';

    printSection('7. DOCUMENTS - Update Invoice');

    const updateInvoiceResult = await requestJson(
        'PUT',
        `/documents/${testInvoiceId}/invoice`,
        {
            numeroFactura: `FAC-SMOKE-UPD-${uniqueSuffix}`,
            fechaOperacion: '2026-02-17',
            fechaVencimiento: '2026-03-17',
            baseImponible: 200,
            iva: 42,
            total: 242,
            movements: [
                {
                    concepto: 'Servicio actualizado',
                    cantidad: 2,
                    precio: 100,
                    baseImponible: 200,
                    iva: 42,
                    total: 242,
                },
            ],
        },
        adminTokens.accessToken,
    );
    recordResult('PUT', '/documents/{invoiceId}/invoice', updateInvoiceResult.status, updateInvoiceResult.duration);

    printSection('7. DOCUMENTS - Confirm Header');

    const confirmHeaderResult = await requestJson(
        'PUT',
        `/documents/${testInvoiceId}/header/confirm`,
        {
            fields: {
                numeroFactura: { action: 'CONFIRM' },
                fechaOperacion: { action: 'CONFIRM' },
                fechaVencimiento: { action: 'CONFIRM' },
                baseImponible: { action: 'CONFIRM' },
                iva: { action: 'CONFIRM' },
                total: { action: 'CONFIRM' },
            },
        },
        adminTokens.accessToken,
    );
    recordResult('PUT', '/documents/{invoiceId}/header/confirm', confirmHeaderResult.status, confirmHeaderResult.duration);

    printSection('7. DOCUMENTS - Confirm Movements');

    const confirmMovementsResult = await requestJson(
        'PUT',
        `/documents/${testInvoiceId}/movements/confirm`,
        {
            movements: [
                { id: testMovementId, action: 'CONFIRM' },
            ],
        },
        adminTokens.accessToken,
    );
    recordResult('PUT', '/documents/{invoiceId}/movements/confirm', confirmMovementsResult.status, confirmMovementsResult.duration);

    printSection('7. DOCUMENTS - Attach File');

    const demoFilePath = join(DEMO_DIR, 'ficticia1.pdf');
    const attachFileResult = await requestMultipart(
        'PUT',
        `/documents/${testInvoiceId}/file`,
        demoFilePath,
        adminTokens.accessToken,
    );
    recordResult('PUT', '/documents/{invoiceId}/file', attachFileResult.status, attachFileResult.duration);

    printSection('7. DOCUMENTS - Download File');

    const downloadFileResult = await requestJson(
        'GET',
        `/documents/${testInvoiceId}/file`,
        undefined,
        adminTokens.accessToken,
    );
    recordResult('GET', '/documents/{invoiceId}/file', downloadFileResult.status, downloadFileResult.duration);

    printSection('7. DOCUMENTS - Reprocess Invoice');

    const reprocessResult = await requestJson(
        'POST',
        `/documents/${testInvoiceId}/reprocess`,
        undefined,
        adminTokens.accessToken,
    );
    recordResult('POST', '/documents/{invoiceId}/reprocess', reprocessResult.status, reprocessResult.duration);

    // ========================================================================
    // 8. DOCUMENTS - Upload (Auto Extraction)
    // ========================================================================
    printSection('8. DOCUMENTS - Upload PDF (Auto Extraction)');

    const uploadFilePath = join(DEMO_DIR, 'ficticia2.pdf');
    const uploadResult = await requestMultipart(
        'POST',
        '/documents',
        uploadFilePath,
        adminTokens.accessToken,
    );
    recordResult('POST', '/documents (upload)', uploadResult.status, uploadResult.duration);

    const uploadedInvoice = parseJson<{ invoiceId: string }>(uploadResult.body);
    const uploadedInvoiceId = uploadedInvoice?.invoiceId;

    // ========================================================================
    // 9. SEARCH (RAG)
    // ========================================================================
    printSection('9. SEARCH - Query');

    const searchResult = await requestJson(
        'POST',
        '/search',
        { query: 'Cual es el importe total de las facturas?' },
        adminTokens.accessToken,
    );
    recordResult('POST', '/search', searchResult.status, searchResult.duration);

    const searchResponse = parseJson<{ queryId: string }>(searchResult.body);
    const queryId = searchResponse?.queryId;

    if (queryId) {
        printSection('9. SEARCH - Get Result');

        const getSearchResult = await requestJson(
            'GET',
            `/search/${queryId}`,
            undefined,
            adminTokens.accessToken,
        );
        recordResult('GET', '/search/{queryId}', getSearchResult.status, getSearchResult.duration);
    }

    // ========================================================================
    // 10. CLEANUP - Delete Invoices
    // ========================================================================
    printSection('10. CLEANUP - Delete Invoice');

    const deleteInvoiceResult = await requestJson(
        'DELETE',
        `/documents/${testInvoiceId}`,
        undefined,
        adminTokens.accessToken,
    );
    recordResult('DELETE', '/documents/{invoiceId}', deleteInvoiceResult.status, deleteInvoiceResult.duration);

    if (uploadedInvoiceId) {
        await requestJson(
            'DELETE',
            `/documents/${uploadedInvoiceId}`,
            undefined,
            adminTokens.accessToken,
        );
    }

    // ========================================================================
    // 11. CLEANUP - Delete Provider
    // ========================================================================
    printSection('11. CLEANUP - Delete Provider');

    const deleteProviderResult = await requestJson(
        'DELETE',
        `/providers/${testProviderId}`,
        undefined,
        adminTokens.accessToken,
    );
    recordResult('DELETE', '/providers/{providerId}', deleteProviderResult.status, deleteProviderResult.duration);

    // ========================================================================
    // 12. AUTH - Refresh Token
    // ========================================================================
    printSection('12. AUTH - Refresh Token');

    const refreshResult = await requestJson(
        'POST',
        '/auth/refresh',
        { refreshToken: adminTokens.refreshToken },
        adminTokens.accessToken,
    );
    recordResult('POST', '/auth/refresh', refreshResult.status, refreshResult.duration);

    const refreshedTokens = parseJson<Tokens>(refreshResult.body);

    // ========================================================================
    // 13. AUTH - Logout
    // ========================================================================
    printSection('13. AUTH - Logout');

    const logoutResult = await requestJson(
        'POST',
        '/auth/logout',
        { refreshToken: refreshedTokens?.refreshToken ?? adminTokens.refreshToken },
        adminTokens.accessToken,
    );
    recordResult('POST', '/auth/logout', logoutResult.status, logoutResult.duration);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    printHeader('TEST SUMMARY');

    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`${colors.bold}Total Endpoints Tested:${colors.reset} ${results.length}`);
    console.log(`${colors.green}Passed:${colors.reset} ${passed}`);
    console.log(`${colors.red}Failed:${colors.reset} ${failed}`);
    console.log(`${colors.cyan}Total Time:${colors.reset} ${totalDuration}ms`);
    console.log();

    // Results table
    console.log(`${colors.dim}${'─'.repeat(70)}${colors.reset}`);
    console.log(
        `${colors.bold}${'Method'.padEnd(8)}${'Endpoint'.padEnd(45)}${'Status'.padEnd(8)}${'Result'.padEnd(8)}${colors.reset}`,
    );
    console.log(`${colors.dim}${'─'.repeat(70)}${colors.reset}`);

    for (const result of results) {
        const statusStr = formatStatus(result.status);
        const resultStr = formatSuccess(result.success);
        console.log(
            `${formatMethod(result.method)}  ${result.endpoint.padEnd(43)}  ${statusStr}    ${resultStr}`,
        );
    }

    console.log(`${colors.dim}${'─'.repeat(70)}${colors.reset}`);

    if (failed > 0) {
        console.log(`\n${colors.red}${colors.bold}Some tests failed!${colors.reset}`);
        process.exitCode = 1;
    } else {
        console.log(`\n${colors.green}${colors.bold}All tests passed!${colors.reset}`);
    }
};

// ============================================================================
// MAIN
// ============================================================================

await run().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`\n${colors.red}${colors.bold}Smoke test failed: ${message}${colors.reset}`);
    if (error instanceof Error && error.stack) {
        console.error(`${colors.dim}${error.stack}${colors.reset}`);
    }
    process.exitCode = 1;
});
