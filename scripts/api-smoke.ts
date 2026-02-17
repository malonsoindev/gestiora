/**
 * @fileoverview API Smoke Test - Evaluacion completa de todos los endpoints
 *
 * Ejecuta pruebas de humo contra todos los 34 endpoints de la API de Gestiora.
 * Muestra por pantalla cada peticion realizada y su resultado de forma visual.
 *
 * Flujo:
 * 1. Admin login -> operaciones de admin -> logout
 * 2. User login -> proveedores, facturas, busqueda, perfil -> refresh -> logout
 *
 * @example
 * # Configurar variables de entorno antes de ejecutar:
 * ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=xxx USER_EMAIL=user@example.com USER_PASSWORD=xxx npx tsx scripts/api-smoke.ts
 *
 * Variables de entorno:
 * - BASE_URL: URL base del servidor (default: http://localhost:3000)
 * - ADMIN_EMAIL: Email del administrador (REQUERIDO)
 * - ADMIN_PASSWORD: Password del administrador (REQUERIDO)
 * - USER_EMAIL: Email del usuario (REQUERIDO)
 * - USER_PASSWORD: Password del usuario (REQUERIDO)
 * - TEST_USER_PASSWORD: Password para usuario de prueba creado (REQUERIDO)
 * - DELAY_MS: Delay entre peticiones en ms (default: 5000)
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

const requiredEnvVars = [
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'USER_EMAIL',
    'USER_PASSWORD',
    'TEST_USER_PASSWORD',
] as const;

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
    console.error(`Error: Variables de entorno requeridas no configuradas: ${missingVars.join(', ')}`);
    console.error('Consulta el encabezado del script para ver las variables necesarias.');
    process.exit(1);
}

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const USER_EMAIL = process.env.USER_EMAIL!;
const USER_PASSWORD = process.env.USER_PASSWORD!;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD!;
const TEST_USER_PASSWORD_CHANGED = process.env.TEST_USER_PASSWORD_CHANGED ?? `${TEST_USER_PASSWORD}New`;
const USER_PASSWORD_TEMP = process.env.USER_PASSWORD_TEMP ?? `${USER_PASSWORD}Tmp`;
const DELAY_MS = Number(process.env.DELAY_MS) || 5000;

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
    bgCyan: '\x1b[46m',
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
    const line = '='.repeat(80);
    console.log(`\n${colors.cyan}${line}${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}  ${title}${colors.reset}`);
    console.log(`${colors.cyan}${line}${colors.reset}\n`);
};

const printSection = (title: string): void => {
    console.log(`\n${colors.bold}${colors.blue}>> ${title}${colors.reset}`);
    console.log(`${colors.dim}${'─'.repeat(60)}${colors.reset}`);
};

const printSeparator = (): void => {
    console.log(`\n${colors.dim}${'━'.repeat(80)}${colors.reset}\n`);
};

const printEndpointInfo = (method: HttpMethod, path: string, description: string): void => {
    console.log(`${colors.bgCyan}${colors.white} ENDPOINT ${colors.reset}`);
    console.log(`${colors.bold}${formatMethod(method)} ${colors.white}${path}${colors.reset}`);
    console.log(`${colors.dim}${description}${colors.reset}`);
};

const printRequest = (method: HttpMethod, path: string, body?: unknown): void => {
    console.log(`\n${colors.dim}┌─ Request ─────────────────────────────────────────────────────────${colors.reset}`);
    console.log(`${colors.dim}│${colors.reset} ${formatMethod(method)} ${colors.white}${path}${colors.reset}`);
    if (body) {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
        const lines = bodyStr.split('\n');
        for (const line of lines.slice(0, 6)) {
            console.log(`${colors.dim}│${colors.reset} ${colors.dim}${line}${colors.reset}`);
        }
        if (lines.length > 6) {
            console.log(`${colors.dim}│${colors.reset} ${colors.dim}... (${lines.length - 6} more lines)${colors.reset}`);
        }
    }
};

const printResponse = (result: RequestResult): void => {
    console.log(`${colors.dim}├─ Response ────────────────────────────────────────────────────────${colors.reset}`);
    console.log(`${colors.dim}│${colors.reset} Status: ${formatStatus(result.status)} ${result.statusText}`);
    console.log(`${colors.dim}│${colors.reset} Time:   ${formatDuration(result.duration)}`);
    
    if (result.body) {
        const bodyStr = typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2);
        const lines = bodyStr.split('\n');
        console.log(`${colors.dim}│${colors.reset} Body:`);
        for (const line of lines.slice(0, 10)) {
            console.log(`${colors.dim}│${colors.reset}   ${colors.dim}${line}${colors.reset}`);
        }
        if (lines.length > 10) {
            console.log(`${colors.dim}│${colors.reset}   ${colors.dim}... (${lines.length - 10} more lines)${colors.reset}`);
        }
    }
    console.log(`${colors.dim}└───────────────────────────────────────────────────────────────────${colors.reset}`);
};

// ============================================================================
// DELAY
// ============================================================================

const delay = (ms: number): Promise<void> => {
    console.log(`\n${colors.dim}⏳ Esperando ${ms / 1000} segundos...${colors.reset}`);
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    const headers: Record<string, string> = {};

    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    const requestInit: RequestInit = { method, headers };
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
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
    console.log(`${colors.dim}Base URL:    ${BASE_URL}${colors.reset}`);
    console.log(`${colors.dim}Admin:       ${ADMIN_EMAIL}${colors.reset}`);
    console.log(`${colors.dim}User:        ${USER_EMAIL}${colors.reset}`);
    console.log(`${colors.dim}Demo Dir:    ${DEMO_DIR}${colors.reset}`);
    console.log(`${colors.dim}Delay:       ${DELAY_MS}ms entre peticiones${colors.reset}`);

    const uniqueSuffix = Date.now().toString(36);
    let testUserId = '';
    let testProviderId = '';
    let testInvoiceId = '';
    let testMovementId = '';
    let uploadedInvoiceId = '';
    let queryId = '';

    // ========================================================================
    // FASE 1: SESION DE ADMINISTRADOR
    // ========================================================================
    printHeader('FASE 1: SESION DE ADMINISTRADOR');

    // ------------------------------------------------------------------------
    // 1. Login Admin
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/auth/login', 
        'Autentica un usuario y devuelve tokens JWT (access y refresh). ' +
        'El access token se usa en el header Authorization para peticiones autenticadas.');

    const loginAdminResult = await requestJson('POST', '/auth/login', {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
    });
    recordResult('POST', '/auth/login (admin)', loginAdminResult.status, loginAdminResult.duration);

    const adminTokens = parseJson<Tokens>(loginAdminResult.body);
    if (!adminTokens?.accessToken) {
        throw new Error('Admin login failed - cannot continue');
    }

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 2. Admin Ping
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('GET', '/admin/ping',
        'Endpoint de verificacion de acceso administrativo. ' +
        'Solo accesible para usuarios con rol ADMIN. Devuelve "pong" si el acceso es correcto.');

    const pingResult = await requestJson('GET', '/admin/ping', undefined, adminTokens.accessToken);
    recordResult('GET', '/admin/ping', pingResult.status, pingResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 3. Create User
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/admin/users',
        'Crea un nuevo usuario en el sistema. Solo administradores pueden crear usuarios. ' +
        'Requiere email, password, roles y estado inicial.');

    const testUserEmail = `smoke-${uniqueSuffix}@example.com`;
    const createUserResult = await requestJson(
        'POST',
        '/admin/users',
        {
            email: testUserEmail,
            password: TEST_USER_PASSWORD,
            roles: ['Usuario'],
            status: 'ACTIVE',
            name: 'Smoke Test User',
        },
        adminTokens.accessToken,
    );
    recordResult('POST', '/admin/users', createUserResult.status, createUserResult.duration);

    const createdUser = parseJson<{ userId: string }>(createUserResult.body);
    testUserId = createdUser?.userId ?? 'user-unknown';

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 4. List Users
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('GET', '/admin/users',
        'Lista todos los usuarios del sistema con paginacion. ' +
        'Soporta parametros page y pageSize para controlar la paginacion.');

    const listUsersResult = await requestJson(
        'GET',
        '/admin/users?page=1&pageSize=10',
        undefined,
        adminTokens.accessToken,
    );
    recordResult('GET', '/admin/users', listUsersResult.status, listUsersResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 5. Get User Detail
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('GET', '/admin/users/{userId}',
        'Obtiene el detalle completo de un usuario especifico por su ID. ' +
        'Incluye email, nombre, roles, estado y fechas de creacion/actualizacion.');

    const getUserResult = await requestJson(
        'GET',
        `/admin/users/${testUserId}`,
        undefined,
        adminTokens.accessToken,
    );
    recordResult('GET', '/admin/users/{userId}', getUserResult.status, getUserResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 6. Update User
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('PUT', '/admin/users/{userId}',
        'Actualiza los datos de un usuario existente. ' +
        'Permite modificar nombre, roles y estado del usuario.');

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

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 7. Change User Password (Admin)
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/admin/users/{userId}/password',
        'Permite a un administrador cambiar la contraseña de cualquier usuario. ' +
        'No requiere la contraseña actual del usuario.');

    const changePasswordResult = await requestJson(
        'POST',
        `/admin/users/${testUserId}/password`,
        { newPassword: TEST_USER_PASSWORD_CHANGED },
        adminTokens.accessToken,
    );
    recordResult('POST', '/admin/users/{userId}/password', changePasswordResult.status, changePasswordResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 8. Login Test User (to create a session to revoke later)
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/auth/login (test user)',
        'Iniciamos sesion con el usuario de prueba para generar una sesion activa. ' +
        'Esto permite probar el endpoint de revocacion de sesiones mas adelante.');

    const testUserLoginResult = await requestJson(
        'POST',
        '/auth/login',
        { email: testUserEmail, password: TEST_USER_PASSWORD_CHANGED },
    );
    recordResult('POST', '/auth/login (test user)', testUserLoginResult.status, testUserLoginResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 9. Revoke User Sessions
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/admin/users/{userId}/sessions/revoke',
        'Revoca todas las sesiones activas de un usuario. ' +
        'Fuerza al usuario a volver a autenticarse en todos sus dispositivos.');

    const revokeSessionsResult = await requestJson(
        'POST',
        `/admin/users/${testUserId}/sessions/revoke`,
        undefined,
        adminTokens.accessToken,
    );
    recordResult('POST', '/admin/users/{userId}/sessions/revoke', revokeSessionsResult.status, revokeSessionsResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 10. Update User Status
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('PATCH', '/admin/users/{userId}/status',
        'Cambia el estado de un usuario (ACTIVE/INACTIVE). ' +
        'Permite activar o desactivar usuarios sin eliminarlos.');

    const updateStatusResult = await requestJson(
        'PATCH',
        `/admin/users/${testUserId}/status`,
        { status: 'INACTIVE' },
        adminTokens.accessToken,
    );
    recordResult('PATCH', '/admin/users/{userId}/status', updateStatusResult.status, updateStatusResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 11. Delete User (Soft Delete)
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('DELETE', '/admin/users/{userId}',
        'Elimina un usuario del sistema (soft delete). ' +
        'El usuario se marca como eliminado pero los datos se conservan para auditoria.');

    const deleteUserResult = await requestJson(
        'DELETE',
        `/admin/users/${testUserId}`,
        undefined,
        adminTokens.accessToken,
    );
    recordResult('DELETE', '/admin/users/{userId}', deleteUserResult.status, deleteUserResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 12. Admin Logout
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/auth/logout',
        'Cierra la sesion del usuario invalidando el refresh token. ' +
        'El access token sigue siendo valido hasta su expiracion natural.');

    const adminLogoutResult = await requestJson(
        'POST',
        '/auth/logout',
        { refreshToken: adminTokens.refreshToken },
        adminTokens.accessToken,
    );
    recordResult('POST', '/auth/logout (admin)', adminLogoutResult.status, adminLogoutResult.duration);

    await delay(DELAY_MS);

    // ========================================================================
    // FASE 2: SESION DE USUARIO
    // ========================================================================
    printHeader('FASE 2: SESION DE USUARIO');

    // ------------------------------------------------------------------------
    // 12. Login User
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/auth/login',
        'Autentica al usuario estandar. Los usuarios con rol Usuario pueden gestionar ' +
        'proveedores, facturas y realizar busquedas, pero no acceder a endpoints de admin.');

    const loginUserResult = await requestJson('POST', '/auth/login', {
        email: USER_EMAIL,
        password: USER_PASSWORD,
    });
    recordResult('POST', '/auth/login (user)', loginUserResult.status, loginUserResult.duration);

    const userTokens = parseJson<Tokens>(loginUserResult.body);
    if (!userTokens?.accessToken) {
        throw new Error('User login failed - cannot continue');
    }

    await delay(DELAY_MS);

    // ========================================================================
    // PROVEEDORES
    // ========================================================================
    printSection('PROVEEDORES');

    // ------------------------------------------------------------------------
    // 13. Create Provider
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/providers',
        'Crea un nuevo proveedor en el sistema. Requiere razon social, CIF valido, ' +
        'direccion y datos de ubicacion. El CIF debe ser unico en el sistema.');

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
        userTokens.accessToken,
    );
    recordResult('POST', '/providers', createProviderResult.status, createProviderResult.duration);

    const createdProvider = parseJson<{ providerId: string }>(createProviderResult.body);
    testProviderId = createdProvider?.providerId ?? 'provider-1';

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 14. List Providers
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('GET', '/providers',
        'Lista todos los proveedores con paginacion. ' +
        'Devuelve razon social, CIF, ubicacion y estado de cada proveedor.');

    const listProvidersResult = await requestJson(
        'GET',
        '/providers?page=1&pageSize=10',
        undefined,
        userTokens.accessToken,
    );
    recordResult('GET', '/providers', listProvidersResult.status, listProvidersResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 15. Get Provider Detail
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('GET', '/providers/{providerId}',
        'Obtiene el detalle completo de un proveedor por su ID. ' +
        'Incluye todos los datos del proveedor y metadatos de auditoria.');

    const getProviderResult = await requestJson(
        'GET',
        `/providers/${testProviderId}`,
        undefined,
        userTokens.accessToken,
    );
    recordResult('GET', '/providers/{providerId}', getProviderResult.status, getProviderResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 16. Update Provider
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('PUT', '/providers/{providerId}',
        'Actualiza los datos de un proveedor existente. ' +
        'Permite modificar razon social, direccion y ubicacion. El CIF no se puede cambiar.');

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
        userTokens.accessToken,
    );
    recordResult('PUT', '/providers/{providerId}', updateProviderResult.status, updateProviderResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 17. Update Provider Status
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('PATCH', '/providers/{providerId}/status',
        'Cambia el estado de un proveedor (ACTIVE/INACTIVE/DRAFT). ' +
        'Proveedores inactivos no pueden recibir nuevas facturas.');

    const updateProviderStatusResult = await requestJson(
        'PATCH',
        `/providers/${testProviderId}/status`,
        { status: 'INACTIVE' },
        userTokens.accessToken,
    );
    recordResult('PATCH', '/providers/{providerId}/status', updateProviderStatusResult.status, updateProviderStatusResult.duration);

    // Re-activate for invoice tests
    await requestJson('PATCH', `/providers/${testProviderId}/status`, { status: 'ACTIVE' }, userTokens.accessToken);

    await delay(DELAY_MS);

    // ========================================================================
    // FACTURAS
    // ========================================================================
    printSection('FACTURAS');

    // ------------------------------------------------------------------------
    // 18. Create Manual Invoice
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/documents/manual',
        'Crea una factura de forma manual sin necesidad de PDF. ' +
        'Permite introducir cabecera y movimientos directamente. Estado inicial: DRAFT.');

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
        userTokens.accessToken,
    );
    recordResult('POST', '/documents/manual', createInvoiceResult.status, createInvoiceResult.duration);

    const createdInvoice = parseJson<{ invoiceId: string }>(createInvoiceResult.body);
    testInvoiceId = createdInvoice?.invoiceId ?? 'invoice-unknown';

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 19. List Invoices
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('GET', '/documents',
        'Lista todas las facturas con paginacion. ' +
        'Muestra numero de factura, proveedor, importes y estado de cada documento.');

    const listInvoicesResult = await requestJson(
        'GET',
        '/documents?page=1&pageSize=10',
        undefined,
        userTokens.accessToken,
    );
    recordResult('GET', '/documents', listInvoicesResult.status, listInvoicesResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 20. Get Invoice Detail
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('GET', '/documents/{invoiceId}',
        'Obtiene el detalle completo de una factura incluyendo todos sus movimientos. ' +
        'Muestra origen de cada campo (IA/MANUAL) y estado de confirmacion.');

    const getInvoiceResult = await requestJson(
        'GET',
        `/documents/${testInvoiceId}`,
        undefined,
        userTokens.accessToken,
    );
    recordResult('GET', '/documents/{invoiceId}', getInvoiceResult.status, getInvoiceResult.duration);

    const invoiceDetail = parseJson<{ movements?: Array<{ id: string }> }>(getInvoiceResult.body);
    testMovementId = invoiceDetail?.movements?.[0]?.id ?? 'movement-unknown';

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 21. Update Invoice
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('PUT', '/documents/{invoiceId}/invoice',
        'Actualiza la cabecera y movimientos de una factura existente. ' +
        'Permite corregir datos extraidos por IA o modificar entradas manuales.');

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
        userTokens.accessToken,
    );
    recordResult('PUT', '/documents/{invoiceId}/invoice', updateInvoiceResult.status, updateInvoiceResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 22. Confirm Invoice Header
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('PUT', '/documents/{invoiceId}/header/confirm',
        'Confirma los campos de la cabecera de una factura. ' +
        'Cada campo puede confirmarse (CONFIRM) o corregirse (CORRECT) con un nuevo valor.');

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
        userTokens.accessToken,
    );
    recordResult('PUT', '/documents/{invoiceId}/header/confirm', confirmHeaderResult.status, confirmHeaderResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 23. Confirm Invoice Movements
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('PUT', '/documents/{invoiceId}/movements/confirm',
        'Confirma los movimientos de una factura. ' +
        'Cada movimiento puede confirmarse, corregirse o eliminarse.');

    // Get updated movements
    const refreshInvoice = await requestJson('GET', `/documents/${testInvoiceId}`, undefined, userTokens.accessToken);
    const refreshedDetail = parseJson<{ movements?: Array<{ id: string }> }>(refreshInvoice.body);
    testMovementId = refreshedDetail?.movements?.[0]?.id ?? testMovementId;

    const confirmMovementsResult = await requestJson(
        'PUT',
        `/documents/${testInvoiceId}/movements/confirm`,
        {
            movements: [
                { id: testMovementId, action: 'CONFIRM' },
            ],
        },
        userTokens.accessToken,
    );
    recordResult('PUT', '/documents/{invoiceId}/movements/confirm', confirmMovementsResult.status, confirmMovementsResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 24. Attach File to Invoice
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('PUT', '/documents/{invoiceId}/file',
        'Adjunta un archivo PDF a una factura existente. ' +
        'El PDF se convierte en la fuente de verdad inmutable del documento.');

    const demoFilePath = join(DEMO_DIR, 'ficticia1.pdf');
    const attachFileResult = await requestMultipart(
        'PUT',
        `/documents/${testInvoiceId}/file`,
        demoFilePath,
        userTokens.accessToken,
    );
    recordResult('PUT', '/documents/{invoiceId}/file', attachFileResult.status, attachFileResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 25. Download Invoice File
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('GET', '/documents/{invoiceId}/file',
        'Descarga el archivo PDF asociado a una factura. ' +
        'Devuelve el archivo binario con el content-type apropiado.');

    const downloadFileResult = await requestJson(
        'GET',
        `/documents/${testInvoiceId}/file`,
        undefined,
        userTokens.accessToken,
    );
    recordResult('GET', '/documents/{invoiceId}/file', downloadFileResult.status, downloadFileResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 26. Reprocess Invoice
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/documents/{invoiceId}/reprocess',
        'Reprocesa la extraccion de datos de una factura usando IA. ' +
        'Util cuando el modelo de IA se ha actualizado o la extraccion inicial fallo.');

    const reprocessResult = await requestJson(
        'POST',
        `/documents/${testInvoiceId}/reprocess`,
        undefined,
        userTokens.accessToken,
    );
    recordResult('POST', '/documents/{invoiceId}/reprocess', reprocessResult.status, reprocessResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 27. Upload Invoice (Auto Extraction)
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/documents',
        'Sube un PDF y extrae automaticamente los datos usando IA. ' +
        'Crea la factura con datos propuestos que el usuario debe validar.');

    const uploadFilePath = join(DEMO_DIR, 'ficticia2.pdf');
    const uploadResult = await requestMultipart(
        'POST',
        '/documents',
        uploadFilePath,
        userTokens.accessToken,
    );
    recordResult('POST', '/documents (upload)', uploadResult.status, uploadResult.duration);

    const uploadedInvoice = parseJson<{ invoiceId: string }>(uploadResult.body);
    uploadedInvoiceId = uploadedInvoice?.invoiceId ?? '';

    await delay(DELAY_MS);

    // ========================================================================
    // BUSQUEDA RAG
    // ========================================================================
    printSection('BUSQUEDA RAG');

    // ------------------------------------------------------------------------
    // 28. Search Query
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/search',
        'Realiza una busqueda en lenguaje natural sobre las facturas. ' +
        'Usa RAG (Retrieval-Augmented Generation) para generar respuestas contextuales.');

    const searchResult = await requestJson(
        'POST',
        '/search',
        { query: 'Cual es el importe total de las facturas?' },
        userTokens.accessToken,
    );
    recordResult('POST', '/search', searchResult.status, searchResult.duration);

    const searchResponse = parseJson<{ queryId: string }>(searchResult.body);
    queryId = searchResponse?.queryId ?? '';

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 29. Get Search Result
    // ------------------------------------------------------------------------
    if (queryId) {
        printSeparator();
        printEndpointInfo('GET', '/search/{queryId}',
            'Obtiene el resultado de una consulta de busqueda por su ID. ' +
            'Incluye la respuesta generada y las referencias a documentos relevantes.');

        const getSearchResult = await requestJson(
            'GET',
            `/search/${queryId}`,
            undefined,
            userTokens.accessToken,
        );
        recordResult('GET', '/search/{queryId}', getSearchResult.status, getSearchResult.duration);

        await delay(DELAY_MS);
    }

    // ========================================================================
    // PERFIL DE USUARIO
    // ========================================================================
    printSection('PERFIL DE USUARIO');

    // ------------------------------------------------------------------------
    // 30. Update Own Profile
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('PATCH', '/users/me',
        'Permite al usuario actualizar su propio perfil. ' +
        'Puede modificar nombre y avatar sin necesidad de permisos de admin.');

    const updateProfileResult = await requestJson(
        'PATCH',
        '/users/me',
        { name: 'Smoke Profile Update', avatar: 'https://example.com/avatar.png' },
        userTokens.accessToken,
    );
    recordResult('PATCH', '/users/me', updateProfileResult.status, updateProfileResult.duration);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 31. Change Own Password
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/users/me/password',
        'Permite al usuario cambiar su propia contraseña. ' +
        'Requiere la contraseña actual para validar la identidad.');

    const changeOwnPasswordResult = await requestJson(
        'POST',
        '/users/me/password',
        {
            currentPassword: USER_PASSWORD,
            newPassword: USER_PASSWORD_TEMP,
        },
        userTokens.accessToken,
    );
    recordResult('POST', '/users/me/password', changeOwnPasswordResult.status, changeOwnPasswordResult.duration);

    // Restore original password
    if (isSuccess(changeOwnPasswordResult.status)) {
        await requestJson(
            'POST',
            '/users/me/password',
            { currentPassword: USER_PASSWORD_TEMP, newPassword: USER_PASSWORD },
            userTokens.accessToken,
        );
    }

    await delay(DELAY_MS);

    // ========================================================================
    // CLEANUP
    // ========================================================================
    printSection('CLEANUP');

    // ------------------------------------------------------------------------
    // 32. Delete Invoice
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('DELETE', '/documents/{invoiceId}',
        'Elimina una factura del sistema (soft delete). ' +
        'La factura se marca como eliminada pero se conserva para auditoria.');

    const deleteInvoiceResult = await requestJson(
        'DELETE',
        `/documents/${testInvoiceId}`,
        undefined,
        userTokens.accessToken,
    );
    recordResult('DELETE', '/documents/{invoiceId}', deleteInvoiceResult.status, deleteInvoiceResult.duration);

    // Delete uploaded invoice too
    if (uploadedInvoiceId) {
        await requestJson('DELETE', `/documents/${uploadedInvoiceId}`, undefined, userTokens.accessToken);
    }

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 33. Delete Provider
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('DELETE', '/providers/{providerId}',
        'Elimina un proveedor del sistema (soft delete). ' +
        'Las facturas asociadas se mantienen pero el proveedor queda inactivo.');

    const deleteProviderResult = await requestJson(
        'DELETE',
        `/providers/${testProviderId}`,
        undefined,
        userTokens.accessToken,
    );
    recordResult('DELETE', '/providers/{providerId}', deleteProviderResult.status, deleteProviderResult.duration);

    await delay(DELAY_MS);

    // ========================================================================
    // REFRESH TOKEN Y LOGOUT
    // ========================================================================
    printSection('REFRESH TOKEN Y LOGOUT');

    // ------------------------------------------------------------------------
    // 34. Refresh Token
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/auth/refresh',
        'Renueva el access token usando el refresh token. ' +
        'Permite mantener la sesion activa sin volver a introducir credenciales.');

    const refreshResult = await requestJson(
        'POST',
        '/auth/refresh',
        { refreshToken: userTokens.refreshToken },
        userTokens.accessToken,
    );
    recordResult('POST', '/auth/refresh', refreshResult.status, refreshResult.duration);

    const refreshedTokens = parseJson<Tokens>(refreshResult.body);

    await delay(DELAY_MS);

    // ------------------------------------------------------------------------
    // 35. Logout User
    // ------------------------------------------------------------------------
    printSeparator();
    printEndpointInfo('POST', '/auth/logout',
        'Cierra la sesion del usuario invalidando el refresh token. ' +
        'Finaliza la sesion de forma segura.');

    const logoutResult = await requestJson(
        'POST',
        '/auth/logout',
        { refreshToken: refreshedTokens?.refreshToken ?? userTokens.refreshToken },
        userTokens.accessToken,
    );
    recordResult('POST', '/auth/logout (user)', logoutResult.status, logoutResult.duration);

    // ========================================================================
    // RESUMEN
    // ========================================================================
    printHeader('RESUMEN DE RESULTADOS');

    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`${colors.bold}Total Endpoints Testeados:${colors.reset} ${results.length}`);
    console.log(`${colors.green}${colors.bold}Exitosos:${colors.reset} ${passed}`);
    console.log(`${colors.red}${colors.bold}Fallidos:${colors.reset} ${failed}`);
    console.log(`${colors.cyan}${colors.bold}Tiempo Total:${colors.reset} ${totalDuration}ms`);
    console.log();

    // Results table
    console.log(`${colors.dim}${'─'.repeat(80)}${colors.reset}`);
    console.log(
        `${colors.bold}${'Method'.padEnd(8)}${'Endpoint'.padEnd(50)}${'Status'.padEnd(10)}${'Result'}${colors.reset}`,
    );
    console.log(`${colors.dim}${'─'.repeat(80)}${colors.reset}`);

    for (const result of results) {
        const statusStr = formatStatus(result.status);
        const resultStr = formatSuccess(result.success);
        console.log(
            `${formatMethod(result.method)}  ${result.endpoint.padEnd(48)}  ${statusStr}      ${resultStr}`,
        );
    }

    console.log(`${colors.dim}${'─'.repeat(80)}${colors.reset}`);

    if (failed > 0) {
        console.log(`\n${colors.red}${colors.bold}⚠ Algunos tests fallaron!${colors.reset}`);
        process.exitCode = 1;
    } else {
        console.log(`\n${colors.green}${colors.bold}✓ Todos los tests pasaron correctamente!${colors.reset}`);
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
