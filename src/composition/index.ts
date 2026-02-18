/**
 * @fileoverview Composition Root - Punto unico de ensamblaje de dependencias
 *
 * Este archivo es el corazon del sistema de inyeccion de dependencias de Gestiora.
 * Siguiendo los principios de Clean Architecture y Dependency Injection, aqui se:
 *
 * 1. Crean todas las instancias de infraestructura (repositorios, adaptadores, servicios)
 * 2. Inyectan las dependencias en los casos de uso
 * 3. Exporta un objeto `compositionRoot` con todos los componentes listos para usar
 *
 * @module composition
 * @see {@link https://blog.ploeh.dk/2011/07/28/CompositionRoot/} Patron Composition Root
 *
 * @example
 * // Uso en el servidor HTTP
 * import { compositionRoot } from '@composition/index.js';
 *
 * const result = await compositionRoot.loginUserUseCase.execute({
 *     email: 'admin@example.com',
 *     password: 'AdminPass1!a',
 *     ipAddress: '127.0.0.1',
 *     userAgent: 'Mozilla/5.0',
 * });
 *
 * @example
 * // Seed de datos de prueba (solo in-memory)
 * import { seedUsers } from '@composition/index.js';
 * await seedUsers();
 */

import bcrypt from 'bcrypt';
import { InMemoryUserRepository } from '@infrastructure/persistence/in-memory/in-memory-user.repository.js';
import { InMemorySessionRepository } from '@infrastructure/persistence/in-memory/in-memory-session.repository.js';
import { InMemoryLoginAttemptRepository } from '@infrastructure/persistence/in-memory/in-memory-login-attempt.repository.js';
import { InMemoryAuditLogger } from '@infrastructure/adapters/in-memory/in-memory-audit-logger.js';
import { SystemDateProvider } from '@infrastructure/adapters/system-date-provider.js';
import { BcryptPasswordHasher } from '@infrastructure/adapters/bcrypt-password-hasher.js';
import { SimpleRefreshTokenHasher } from '@infrastructure/adapters/simple-refresh-token-hasher.js';
import { JwtTokenService } from '@infrastructure/adapters/jwt-token.service.js';
import { InMemoryLoginRateLimiter } from '@infrastructure/adapters/in-memory/in-memory-login-rate-limiter.js';
import { PrefixedIdGenerator } from '@infrastructure/adapters/prefixed-id-generator.js';
import { LoginUserUseCase } from '@application/use-cases/login-user.use-case.js';
import { RefreshAccessTokenUseCase } from '@application/use-cases/refresh-access-token.use-case.js';
import { LogoutUserUseCase } from '@application/use-cases/logout-user.use-case.js';
import { AuthorizeRequestUseCase } from '@application/use-cases/authorize-request.use-case.js';
import { AntiBruteForceUseCase } from '@application/use-cases/anti-brute-force.use-case.js';
import { ListUsersUseCase } from '@application/use-cases/list-users.use-case.js';
import { GetUserDetailUseCase } from '@application/use-cases/get-user-detail.use-case.js';
import { UpdateUserUseCase } from '@application/use-cases/update-user.use-case.js';
import { UpdateUserStatusUseCase } from '@application/use-cases/update-user-status.use-case.js';
import { SoftDeleteUserUseCase } from '@application/use-cases/soft-delete-user.use-case.js';
import { UpdateOwnProfileUseCase } from '@application/use-cases/update-own-profile.use-case.js';
import { RevokeUserSessionsUseCase } from '@application/use-cases/revoke-user-sessions.use-case.js';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case.js';
import { ChangeUserPasswordUseCase } from '@application/use-cases/change-user-password.use-case.js';
import { ChangeOwnPasswordUseCase } from '@application/use-cases/change-own-password.use-case.js';
import { ListProvidersUseCase } from '@application/use-cases/list-providers.use-case.js';
import { GetProviderDetailUseCase } from '@application/use-cases/get-provider-detail.use-case.js';
import { UpdateProviderUseCase } from '@application/use-cases/update-provider.use-case.js';
import { UpdateProviderStatusUseCase } from '@application/use-cases/update-provider-status.use-case.js';
import { SoftDeleteProviderUseCase } from '@application/use-cases/soft-delete-provider.use-case.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import { Email } from '@domain/value-objects/email.value-object.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { config, usePostgresDatabase } from '@config/env.js';
import { DatabaseFactory } from '@infrastructure/database/database-factory.js';
import { PostgresUserRepository } from '@infrastructure/persistence/postgres/postgres-user.repository.js';
import { PostgresSessionRepository } from '@infrastructure/persistence/postgres/postgres-session.repository.js';
import { PostgresLoginAttemptRepository } from '@infrastructure/persistence/postgres/postgres-login-attempt.repository.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { InMemoryProviderRepository } from '@infrastructure/persistence/in-memory/in-memory-provider.repository.js';
import { PostgresProviderRepository } from '@infrastructure/persistence/postgres/postgres-provider.repository.js';
import { PostgresInvoiceRepository } from '@infrastructure/persistence/postgres/postgres-invoice.repository.js';
import { PostgresSearchQueryRepository } from '@infrastructure/persistence/postgres/postgres-search-query.repository.js';
import { CreateProviderUseCase } from '@application/use-cases/create-provider.use-case.js';
import { InMemoryInvoiceRepository } from '@infrastructure/persistence/in-memory/in-memory-invoice.repository.js';
import { CreateManualInvoiceUseCase } from '@application/use-cases/create-manual-invoice.use-case.js';
import { AttachInvoiceFileUseCase } from '@application/use-cases/attach-invoice-file.use-case.js';
import { UpdateManualInvoiceUseCase } from '@application/use-cases/update-manual-invoice.use-case.js';
import { ConfirmInvoiceMovementsUseCase } from '@application/use-cases/confirm-invoice-movements.use-case.js';
import { ConfirmInvoiceHeaderUseCase } from '@application/use-cases/confirm-invoice-header.use-case.js';
import { ReprocessInvoiceExtractionUseCase } from '@application/use-cases/reprocess-invoice-extraction.use-case.js';
import { ListInvoicesUseCase } from '@application/use-cases/list-invoices.use-case.js';
import { GetInvoiceDetailUseCase } from '@application/use-cases/get-invoice-detail.use-case.js';
import { SoftDeleteInvoiceUseCase } from '@application/use-cases/soft-delete-invoice.use-case.js';
import { GetInvoiceFileUseCase } from '@application/use-cases/get-invoice-file.use-case.js';
import { UploadInvoiceDocumentUseCase } from '@application/use-cases/upload-invoice-document.use-case.js';
import { StubInvoiceExtractionAgent } from '@infrastructure/adapters/invoice-extraction/stub-invoice-extraction-agent.js';
import { StubErrorInvoiceExtractionAgent } from '@infrastructure/adapters/invoice-extraction/stub-error-invoice-extraction-agent.js';
import type { InvoiceExtractionAgent } from '@application/ports/invoice-extraction-agent.js';
import { GenkitInvoiceExtractionAgent } from '@infrastructure/adapters/invoice-extraction/genkit-invoice-extraction-agent.js';
import { createGenkitInvoicePromptRunner } from '@infrastructure/adapters/invoice-extraction/genkit-invoice-extraction-prompt-runner.js';
import { PdfTextExtractor } from '@infrastructure/adapters/invoice-extraction/pdf-text-extractor.js';
import { loadPdfParse } from '@infrastructure/adapters/pdf-parse-resolver.js';
import { InMemoryFileStorage } from '@infrastructure/adapters/in-memory/in-memory-file-storage.js';
import { LocalFileStorage } from '@infrastructure/adapters/local/local-file-storage.js';
import { createGenkitRagClient } from '@infrastructure/adapters/rag/genkit-rag-client.js';
import { DevLocalRagIndexer } from '@infrastructure/adapters/rag/dev-local-rag-indexer.js';
import { DevLocalRagRetriever } from '@infrastructure/adapters/rag/dev-local-rag-retriever.js';
import { GenkitRagAnswerGenerator } from '@infrastructure/adapters/rag/genkit-rag-answer-generator.js';
import { IndexInvoicesForRagUseCase } from '@application/use-cases/index-invoices-for-rag.use-case.js';
import { QueryInvoicesRagUseCase } from '@application/use-cases/query-invoices-rag.use-case.js';
import { RagReindexInvoiceService } from '@application/services/rag-reindex-invoice.service.js';
import { RagReindexProviderInvoicesService } from '@application/services/rag-reindex-provider-invoices.service.js';
import { RagReindexAllInvoicesService } from '@application/services/rag-reindex-all-invoices.service.js';
import { InMemorySearchQueryRepository } from '@infrastructure/adapters/in-memory/in-memory-search-query.repository.js';
import { SearchQueryIdGeneratorCrypto } from '@infrastructure/adapters/crypto/search-query-id-generator.js';
import { ProcessSearchQueryUseCase } from '@application/use-cases/process-search-query.use-case.js';
import { GetSearchResultUseCase } from '@application/use-cases/get-search-result.use-case.js';
import { ConsoleLogger } from '@infrastructure/adapters/logging/console-logger.js';
import { NoopLogger } from '@infrastructure/adapters/logging/noop-logger.js';
import type { Logger } from '@application/ports/logger.js';
import { isTest } from '@config/env.js';

/* ============================================================================
 * CONSTANTES DE CONFIGURACION
 * ============================================================================
 * Valores por defecto para autenticacion y seguridad.
 * Estas constantes controlan el comportamiento de tokens JWT y proteccion
 * contra ataques de fuerza bruta.
 * ========================================================================= */

/**
 * Tiempo de vida del access token en segundos.
 * @constant {number}
 * @default 900 (15 minutos)
 */
const ACCESS_TOKEN_TTL_SECONDS = 900;

/**
 * Tiempo de vida del refresh token en segundos.
 * @constant {number}
 * @default 2_592_000 (30 dias)
 */
const REFRESH_TOKEN_TTL_SECONDS = 2_592_000;

/**
 * Numero maximo de intentos de login fallidos antes de bloquear.
 * @constant {number}
 * @default 5
 */
const MAX_LOGIN_ATTEMPTS = 5;

/**
 * Ventana de tiempo (en minutos) para contar intentos de login.
 * @constant {number}
 * @default 15
 */
const LOGIN_WINDOW_MINUTES = 15;

/**
 * Duracion del bloqueo (en minutos) tras superar el limite de intentos.
 * @constant {number}
 * @default 30
 */
const LOGIN_LOCK_MINUTES = 30;

/* ============================================================================
 * INFRAESTRUCTURA: BASE DE DATOS Y REPOSITORIOS
 * ============================================================================
 * Seleccion dinamica de repositorios segun la variable de entorno DATABASE_TYPE.
 * - 'postgres': Usa PostgreSQL con cliente SQL real
 * - 'in-memory': Usa repositorios en memoria (desarrollo/testing)
 *
 * El patron Strategy permite cambiar la implementacion sin modificar los
 * casos de uso, cumpliendo con el Dependency Inversion Principle.
 * ========================================================================= */

/** Indica si se usa PostgreSQL como base de datos */
const usePostgres = usePostgresDatabase();

/** Cliente SQL para PostgreSQL (undefined si se usa in-memory) */
const sqlClient = usePostgres ? DatabaseFactory.createClient() : undefined;

/** Unit of Work para transacciones (undefined si se usa in-memory) */
const unitOfWork = usePostgres ? DatabaseFactory.createUnitOfWork() : undefined;

/** Verifica la conexion a PostgreSQL si esta habilitado */
if (usePostgres && sqlClient) {
    await DatabaseFactory.checkConnection();
}

/**
 * Repositorio de usuarios.
 * Implementa UserRepository port.
 * @see {@link PostgresUserRepository} para produccion
 * @see {@link InMemoryUserRepository} para desarrollo/testing
 */
const userRepository = usePostgres && sqlClient
    ? new PostgresUserRepository(sqlClient)
    : new InMemoryUserRepository();

/**
 * Repositorio de sesiones de usuario.
 * Gestiona sesiones activas para autenticacion JWT.
 */
const sessionRepository = usePostgres && sqlClient
    ? new PostgresSessionRepository(sqlClient)
    : new InMemorySessionRepository();

/**
 * Repositorio de intentos de login.
 * Usado por el sistema anti brute-force para tracking de intentos fallidos.
 */
const loginAttemptRepository = usePostgres && sqlClient
    ? new PostgresLoginAttemptRepository(sqlClient)
    : new InMemoryLoginAttemptRepository();

/**
 * Repositorio de proveedores.
 * Gestiona entidades Provider (razon social, CIF, direccion).
 */
const providerRepository = usePostgres && sqlClient
    ? new PostgresProviderRepository(sqlClient)
    : new InMemoryProviderRepository();

/**
 * Repositorio de facturas.
 * Gestiona entidades Invoice con sus movimientos asociados.
 */
const invoiceRepository = usePostgres && sqlClient
    ? new PostgresInvoiceRepository(sqlClient)
    : new InMemoryInvoiceRepository();
/* ============================================================================
 * INFRAESTRUCTURA: ALMACENAMIENTO DE ARCHIVOS
 * ============================================================================
 * Seleccion dinamica segun STORAGE_TYPE:
 * - 'local': Almacena archivos en el sistema de archivos local
 * - 'in-memory': Almacena en memoria (desarrollo/testing)
 * ========================================================================= */

/**
 * Almacenamiento de archivos (PDFs de facturas).
 * @see {@link LocalFileStorage} para produccion
 * @see {@link InMemoryFileStorage} para desarrollo/testing
 */
const fileStorage = config.STORAGE_TYPE === 'local'
    ? new LocalFileStorage(config.STORAGE_PATH)
    : new InMemoryFileStorage();

/* ============================================================================
 * ADAPTADORES COMPARTIDOS
 * ============================================================================
 * Servicios transversales utilizados por multiples casos de uso.
 * Implementan los ports definidos en la capa de aplicacion.
 * ========================================================================= */

/**
 * Logger de auditoria.
 * Registra acciones criticas del sistema para trazabilidad.
 */
const auditLogger = new InMemoryAuditLogger();

/**
 * Proveedor de fecha/hora actual.
 * Abstrae Date para facilitar testing con fechas fijas.
 * @see {@link SystemDateProvider}
 */
const dateProvider = new SystemDateProvider();

/* ============================================================================
 * LOGGING TECNICO
 * ============================================================================
 * Logger de proposito general para diagnostico y depuracion.
 * Seleccion dinamica segun NODE_ENV:
 * - test: NoopLogger (silencioso)
 * - development: ConsoleLogger nivel debug
 * - production: ConsoleLogger nivel info
 * ========================================================================= */

/**
 * Logger tecnico.
 * Registra informacion de diagnostico y errores del sistema.
 */
const logger: Logger = isTest()
    ? new NoopLogger()
    : new ConsoleLogger({
        minLevel: config.NODE_ENV === 'production' ? 'info' : 'debug',
    });

/* ============================================================================
 * GENERADORES DE ID
 * ============================================================================
 * Generadores de identificadores unicos para cada tipo de entidad.
 * Usan timestamps + componente aleatorio para garantizar unicidad.
 * ========================================================================= */

/** Generador de IDs para entidades User */
const userIdGenerator = new PrefixedIdGenerator('user');

/** Generador de IDs para entidades Provider */
const providerIdGenerator = new PrefixedIdGenerator('provider');

/** Generador de IDs para entidades Invoice */
const invoiceIdGenerator = new PrefixedIdGenerator('invoice');

/** Generador de IDs para entidades InvoiceMovement */
const invoiceMovementIdGenerator = new PrefixedIdGenerator('movement');

/** Generador de IDs para entidades Session */
const sessionIdGenerator = new PrefixedIdGenerator('session');

/* ============================================================================
 * SEGURIDAD: HASHING Y TOKENS
 * ============================================================================
 * Adaptadores para operaciones criptograficas de autenticacion.
 * ========================================================================= */

/**
 * Hasher de contrasenas.
 * Usa bcrypt con salt rounds configurables.
 */
const passwordHasher = new BcryptPasswordHasher();

/**
 * Hasher de refresh tokens.
 * Implementacion simplificada para tokens de sesion.
 */
const refreshTokenHasher = new SimpleRefreshTokenHasher();

/**
 * Servicio de tokens JWT.
 * Genera y verifica access tokens y refresh tokens.
 * @param {string} accessSecret - Secreto para firmar access tokens
 * @param {string} refreshSecret - Secreto para firmar refresh tokens
 * @param {number} accessTtl - TTL del access token en segundos
 * @param {number} refreshTtl - TTL del refresh token en segundos
 */
const tokenService = new JwtTokenService(
    config.JWT_ACCESS_SECRET,
    config.JWT_REFRESH_SECRET,
    ACCESS_TOKEN_TTL_SECONDS,
    REFRESH_TOKEN_TTL_SECONDS,
);

/**
 * Rate limiter para login.
 * Previene ataques de fuerza bruta limitando intentos por IP/usuario.
 */
const loginRateLimiter = new InMemoryLoginRateLimiter(
    loginAttemptRepository,
    MAX_LOGIN_ATTEMPTS,
    LOGIN_WINDOW_MINUTES,
);

/**
 * Repositorio de consultas de busqueda RAG.
 * Almacena historial de consultas y sus resultados.
 */
const searchQueryRepository = usePostgres && sqlClient
    ? new PostgresSearchQueryRepository(sqlClient)
    : new InMemorySearchQueryRepository();

/** Generador de IDs para consultas de busqueda (usa crypto.randomUUID) */
const searchQueryIdGenerator = new SearchQueryIdGeneratorCrypto();

/* ============================================================================
 * RAG (RETRIEVAL-AUGMENTED GENERATION) Y BUSQUEDA SEMANTICA
 * ============================================================================
 * Componentes para consultas en lenguaje natural sobre facturas.
 * Usa Genkit como framework de IA para embeddings y generacion de respuestas.
 *
 * Flujo RAG:
 * 1. Indexacion: Las facturas se convierten en embeddings y se almacenan
 * 2. Retrieval: Se buscan documentos relevantes para la consulta
 * 3. Generation: Se genera una respuesta usando el contexto recuperado
 * ========================================================================= */

/**
 * Cliente Genkit para operaciones RAG.
 * Configura el indice, directorio de prompts y modelo de embeddings.
 */
const genkitRagClient = createGenkitRagClient({
    indexName: config.RAG_INDEX_NAME,
    promptDir: config.RAG_PROMPT_DIR,
    embedderModel: config.RAG_EMBEDDER_MODEL,
});

/**
 * Indexador RAG para desarrollo local.
 * Almacena embeddings de facturas para busqueda semantica.
 */
const ragIndexer = new DevLocalRagIndexer({
    ai: genkitRagClient,
    indexName: config.RAG_INDEX_NAME,
});

/**
 * Retriever RAG para desarrollo local.
 * Recupera documentos relevantes basados en similitud semantica.
 */
const ragRetriever = new DevLocalRagRetriever({
    ai: genkitRagClient,
    indexName: config.RAG_INDEX_NAME,
});

/**
 * Generador de respuestas RAG.
 * Usa el contexto recuperado para generar respuestas en lenguaje natural.
 */
const ragAnswerGenerator = new GenkitRagAnswerGenerator({
    ai: genkitRagClient,
    modelName: config.OAI_MODEL_NAME ?? 'gpt-4o-mini',
    promptName: 'rag-query',
});

/* ============================================================================
 * USE CASES: RAG Y BUSQUEDA
 * ============================================================================
 * Casos de uso para indexacion y consulta de facturas via RAG.
 * ========================================================================= */

/**
 * Caso de uso: Indexar facturas para RAG.
 * Convierte facturas en documentos indexables con embeddings.
 * @param {number} movementsChunkSize - Tamano de chunk para movimientos
 */
const indexInvoicesForRagUseCase = new IndexInvoicesForRagUseCase({
    ragIndexer,
    movementsChunkSize: 10,
});

/**
 * Caso de uso: Consultar facturas con lenguaje natural.
 * Busca y genera respuestas basadas en el contexto de facturas.
 * @param {number} topK - Numero de documentos a recuperar
 */
const queryInvoicesRagUseCase = new QueryInvoicesRagUseCase({
    ragRetriever,
    ragAnswerGenerator,
    topK: 5,
});

/**
 * Caso de uso: Procesar consulta de busqueda.
 * Orquesta la busqueda RAG y almacena el resultado.
 */
const processSearchQueryUseCase = new ProcessSearchQueryUseCase({
    queryInvoicesRagUseCase,
    searchQueryRepository,
    searchQueryIdGenerator,
    dateProvider,
});

/**
 * Caso de uso: Obtener resultado de busqueda.
 * Recupera un resultado de busqueda previamente procesado.
 */
const getSearchResultUseCase = new GetSearchResultUseCase({
    searchQueryRepository,
});

/* ============================================================================
 * SERVICIOS: REINDEXACION RAG
 * ============================================================================
 * Servicios para mantener el indice RAG sincronizado con los datos.
 * ========================================================================= */

/**
 * Servicio: Reindexar una factura individual.
 * Se ejecuta cuando se crea o modifica una factura.
 */
const ragReindexInvoiceService = new RagReindexInvoiceService({
    invoiceRepository,
    providerRepository,
    searchQueryRepository,
    indexInvoicesForRagUseCase,
});

/**
 * Servicio: Reindexar todas las facturas de un proveedor.
 * Se ejecuta cuando se modifica un proveedor.
 * @param {number} pageSize - Tamano de pagina para procesamiento por lotes
 */
const ragReindexProviderInvoicesService = new RagReindexProviderInvoicesService({
    invoiceRepository,
    providerRepository,
    searchQueryRepository,
    indexInvoicesForRagUseCase,
    pageSize: 200,
});

/**
 * Servicio: Reindexar todas las facturas del sistema.
 * Se ejecuta para reconstruir el indice completo.
 * @param {number} pageSize - Tamano de pagina para procesamiento por lotes
 */
const ragReindexAllInvoicesService = new RagReindexAllInvoicesService({
    invoiceRepository,
    providerRepository,
    searchQueryRepository,
    indexInvoicesForRagUseCase,
    pageSize: 200,
});

/* ============================================================================
 * USE CASES: AUTENTICACION (IAM CORE)
 * ============================================================================
 * Casos de uso del sistema de Identity and Access Management.
 * Implementan login, refresh, logout, autorizacion y proteccion anti brute-force.
 * ========================================================================= */

/**
 * Caso de uso: Login de usuario.
 * Valida credenciales, genera tokens JWT y crea sesion.
 *
 * @example
 * const result = await loginUserUseCase.execute({
 *     email: 'user@example.com',
 *     password: 'SecurePass123!',
 *     ipAddress: '192.168.1.1',
 *     userAgent: 'Mozilla/5.0...',
 * });
 */
const loginUserUseCase = new LoginUserUseCase({
    userRepository,
    sessionRepository,
    passwordHasher,
    tokenService,
    refreshTokenHasher,
    sessionIdGenerator,
    auditLogger,
    loginRateLimiter,
    loginAttemptRepository,
    dateProvider,
    accessTokenTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: REFRESH_TOKEN_TTL_SECONDS,
});

/**
 * Caso de uso: Refrescar access token.
 * Genera nuevo access token usando un refresh token valido.
 * Soporta rotacion de refresh tokens para mayor seguridad.
 */
const refreshAccessTokenUseCase = new RefreshAccessTokenUseCase({
    sessionRepository,
    userRepository,
    tokenService,
    refreshTokenHasher,
    auditLogger,
    dateProvider,
    accessTokenTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: REFRESH_TOKEN_TTL_SECONDS,
    rotateRefreshTokens: true,
});

/**
 * Caso de uso: Logout de usuario.
 * Invalida la sesion actual del usuario.
 */
const logoutUserUseCase = new LogoutUserUseCase({
    sessionRepository,
    refreshTokenHasher,
    auditLogger,
    dateProvider,
});

/**
 * Caso de uso: Autorizar peticion HTTP.
 * Valida el access token y extrae informacion del usuario.
 * Usado por middleware de autenticacion.
 */
const authorizeRequestUseCase = new AuthorizeRequestUseCase({
    tokenService,
    auditLogger,
    dateProvider,
});

/**
 * Caso de uso: Proteccion anti brute-force.
 * Verifica si una IP/usuario esta bloqueado por exceso de intentos.
 */
const antiBruteForceUseCase = new AntiBruteForceUseCase({
    loginAttemptRepository,
    auditLogger,
    dateProvider,
    maxAttempts: MAX_LOGIN_ATTEMPTS,
    windowMinutes: LOGIN_WINDOW_MINUTES,
    lockMinutes: LOGIN_LOCK_MINUTES,
});

/* ============================================================================
 * USE CASES: GESTION DE USUARIOS
 * ============================================================================
 * CRUD de usuarios con soporte para roles (ADMIN, USER) y estados.
 * Incluye gestion de contrasenas y sesiones.
 * ========================================================================= */

/**
 * Caso de uso: Crear usuario.
 * Solo ejecutable por administradores.
 */
const createUserUseCase = new CreateUserUseCase({
    userRepository,
    passwordHasher,
    userIdGenerator,
    auditLogger,
    dateProvider,
});

/**
 * Caso de uso: Listar usuarios.
 * Soporta paginacion y filtros.
 */
const listUsersUseCase = new ListUsersUseCase({
    userRepository,
});

/**
 * Caso de uso: Obtener detalle de usuario.
 * Retorna informacion completa de un usuario por ID.
 */
const getUserDetailUseCase = new GetUserDetailUseCase({
    userRepository,
});

/**
 * Caso de uso: Actualizar usuario.
 * Permite modificar nombre, email y roles.
 */
const updateUserUseCase = new UpdateUserUseCase({
    userRepository,
    dateProvider,
});

/**
 * Caso de uso: Cambiar estado de usuario.
 * Permite activar/desactivar usuarios.
 */
const updateUserStatusUseCase = new UpdateUserStatusUseCase({
    userRepository,
    dateProvider,
});

/**
 * Caso de uso: Eliminar usuario (soft delete).
 * Marca el usuario como eliminado sin borrar datos.
 * Revoca todas las sesiones activas.
 */
const softDeleteUserUseCase = new SoftDeleteUserUseCase({
    userRepository,
    sessionRepository,
    dateProvider,
});

/**
 * Caso de uso: Actualizar perfil propio.
 * Permite al usuario modificar su propio nombre.
 */
const updateOwnProfileUseCase = new UpdateOwnProfileUseCase({
    userRepository,
    dateProvider,
});

/**
 * Caso de uso: Revocar sesiones de usuario.
 * Invalida todas las sesiones activas de un usuario.
 */
const revokeUserSessionsUseCase = new RevokeUserSessionsUseCase({
    userRepository,
    sessionRepository,
});

/**
 * Caso de uso: Cambiar contrasena de usuario (admin).
 * Permite a un admin cambiar la contrasena de cualquier usuario.
 */
const changeUserPasswordUseCase = new ChangeUserPasswordUseCase({
    userRepository,
    passwordHasher,
    auditLogger,
    dateProvider,
});

/**
 * Caso de uso: Cambiar contrasena propia.
 * Permite al usuario cambiar su propia contrasena.
 * Requiere contrasena actual para validacion.
 */
const changeOwnPasswordUseCase = new ChangeOwnPasswordUseCase({
    userRepository,
    passwordHasher,
    auditLogger,
    dateProvider,
});

/* ============================================================================
 * USE CASES: GESTION DE PROVEEDORES
 * ============================================================================
 * CRUD de proveedores con soporte para CIF espanol y estados.
 * Incluye reindexacion automatica de facturas RAG cuando cambia el proveedor.
 * ========================================================================= */

/**
 * Caso de uso: Crear proveedor.
 * Valida CIF unico y crea entidad Provider.
 */
const createProviderUseCase = new CreateProviderUseCase({
    providerRepository,
    providerIdGenerator,
    auditLogger,
    dateProvider,
});

/**
 * Caso de uso: Listar proveedores.
 * Soporta paginacion y filtros por estado.
 */
const listProvidersUseCase = new ListProvidersUseCase({
    providerRepository,
});

/**
 * Caso de uso: Obtener detalle de proveedor.
 * Retorna informacion completa de un proveedor por ID.
 */
const getProviderDetailUseCase = new GetProviderDetailUseCase({
    providerRepository,
});

/**
 * Caso de uso: Actualizar proveedor.
 * Modifica datos del proveedor y reindexa facturas en RAG.
 */
const updateProviderUseCase = new UpdateProviderUseCase({
    providerRepository,
    auditLogger,
    dateProvider,
    ragReindexProviderInvoicesService,
});

/**
 * Caso de uso: Cambiar estado de proveedor.
 * Permite activar/desactivar proveedores.
 * Reindexa facturas en RAG.
 */
const updateProviderStatusUseCase = new UpdateProviderStatusUseCase({
    providerRepository,
    auditLogger,
    dateProvider,
    ragReindexProviderInvoicesService,
});

/**
 * Caso de uso: Eliminar proveedor (soft delete).
 * Marca el proveedor como eliminado.
 * Reindexa facturas en RAG.
 */
const softDeleteProviderUseCase = new SoftDeleteProviderUseCase({
    providerRepository,
    auditLogger,
    dateProvider,
    ragReindexProviderInvoicesService,
});

/* ============================================================================
 * USE CASES: GESTION DE FACTURAS
 * ============================================================================
 * CRUD de facturas con soporte para:
 * - Creacion manual (datos introducidos por usuario)
 * - Upload de PDF con extraccion automatica via IA
 * - Confirmacion de cabecera y movimientos
 * - Reindexacion automatica en RAG
 * ========================================================================= */

/**
 * Caso de uso: Crear factura manual.
 * Crea una factura introduciendo los datos manualmente.
 * Reindexa en RAG automaticamente.
 */
const createManualInvoiceUseCase = new CreateManualInvoiceUseCase({
    providerRepository,
    invoiceRepository,
    auditLogger,
    dateProvider,
    invoiceIdGenerator,
    invoiceMovementIdGenerator,
    ragReindexInvoiceService,
});

/**
 * Caso de uso: Adjuntar archivo a factura.
 * Sube un PDF y lo asocia a una factura existente.
 */
const attachInvoiceFileUseCase = new AttachInvoiceFileUseCase({
    invoiceRepository,
    fileStorage,
    auditLogger,
    dateProvider,
    ragReindexInvoiceService,
});

/**
 * Caso de uso: Actualizar factura manual.
 * Modifica datos de una factura existente.
 */
const updateManualInvoiceUseCase = new UpdateManualInvoiceUseCase({
    invoiceRepository,
    invoiceMovementIdGenerator,
    auditLogger,
    dateProvider,
    ragReindexInvoiceService,
});

/**
 * Caso de uso: Confirmar movimientos de factura.
 * Marca los movimientos extraidos como validados.
 */
const confirmInvoiceMovementsUseCase = new ConfirmInvoiceMovementsUseCase({
    invoiceRepository,
    auditLogger,
    dateProvider,
    ragReindexInvoiceService,
});

/**
 * Caso de uso: Confirmar cabecera de factura.
 * Marca la cabecera extraida como validada.
 */
const confirmInvoiceHeaderUseCase = new ConfirmInvoiceHeaderUseCase({
    invoiceRepository,
    auditLogger,
    dateProvider,
    ragReindexInvoiceService,
});

/**
 * Caso de uso: Listar facturas.
 * Soporta paginacion y filtros por proveedor/estado.
 */
const listInvoicesUseCase = new ListInvoicesUseCase({
    invoiceRepository,
});

/**
 * Caso de uso: Obtener detalle de factura.
 * Retorna informacion completa incluyendo movimientos.
 */
const getInvoiceDetailUseCase = new GetInvoiceDetailUseCase({
    invoiceRepository,
});

/**
 * Caso de uso: Eliminar factura (soft delete).
 * Marca la factura como eliminada.
 * Actualiza el indice RAG.
 */
const softDeleteInvoiceUseCase = new SoftDeleteInvoiceUseCase({
    invoiceRepository,
    auditLogger,
    dateProvider,
    ragReindexInvoiceService,
});

/**
 * Caso de uso: Obtener archivo de factura.
 * Recupera el PDF asociado a una factura.
 */
const getInvoiceFileUseCase = new GetInvoiceFileUseCase({
    invoiceRepository,
    fileStorage,
});

/* ============================================================================
 * EXTRACCION DE DATOS: PDF E IA
 * ============================================================================
 * Componentes para extraer datos estructurados de PDFs de facturas.
 *
 * Pipeline de extraccion:
 * 1. PdfTextExtractor: Extrae texto del PDF usando pdf-parse
 * 2. GenkitPromptRunner: Envia el texto a un LLM para extraer datos
 * 3. InvoiceExtractionAgent: Orquesta el proceso completo
 *
 * Tipos de agente (segun AI_AGENT_TYPE):
 * - 'stub': Retorna datos fijos (desarrollo)
 * - 'stub-error': Simula errores (testing)
 * - 'genkit': Usa IA real (produccion)
 * ========================================================================= */

/** Cargador dinamico del modulo pdf-parse (CommonJS) */
const pdfParse = loadPdfParse();

/** Extractor de texto de PDFs */
const pdfTextExtractor = new PdfTextExtractor(async (content) => pdfParse(content));

/** Runner de prompts Genkit para extraccion de facturas */
const genkitPromptRunner = createGenkitInvoicePromptRunner({
    model: config.OAI_MODEL_NAME ?? 'gpt-4o-mini',
});

/**
 * Wrapper para extraer texto de un PDF.
 * Lanza excepcion si la extraccion falla.
 * @param {Buffer} content - Contenido del PDF
 * @returns {Promise<string>} Texto extraido
 */
const genkitTextExtractor = async (content: Buffer) => {
    const result = await pdfTextExtractor.extract(content);
    if (!result.success) {
        throw result.error;
    }
    return result.value;
};

/**
 * Factory para crear el agente de extraccion apropiado.
 * Selecciona implementacion segun AI_AGENT_TYPE.
 * @returns {InvoiceExtractionAgent} Agente configurado
 */
const createExtractionAgent = (): InvoiceExtractionAgent => {
    if (config.AI_AGENT_TYPE === 'stub-error') {
        return new StubErrorInvoiceExtractionAgent();
    }
    if (config.AI_AGENT_TYPE === 'genkit') {
        return new GenkitInvoiceExtractionAgent({
            promptRunner: genkitPromptRunner,
            textExtractor: genkitTextExtractor,
        });
    }
    return new StubInvoiceExtractionAgent();
};

/** Agente de extraccion de facturas (instancia singleton) */
const extractionAgent = createExtractionAgent();

/* ============================================================================
 * USE CASES: EXTRACCION Y UPLOAD DE FACTURAS
 * ============================================================================
 * Casos de uso que utilizan el agente de extraccion IA.
 * ========================================================================= */

/**
 * Caso de uso: Reprocesar extraccion de factura.
 * Vuelve a extraer datos de un PDF ya subido.
 * Util cuando falla la extraccion inicial o se actualiza el modelo.
 */
const reprocessInvoiceExtractionUseCase = new ReprocessInvoiceExtractionUseCase({
    invoiceRepository,
    fileStorage,
    extractionAgent,
    auditLogger,
    dateProvider,
    invoiceMovementIdGenerator,
    ragReindexInvoiceService,
});

/**
 * Caso de uso: Upload de documento de factura.
 * Sube un PDF, extrae datos via IA, y crea la factura.
 * Puede crear el proveedor automaticamente si no existe.
 */
const uploadInvoiceDocumentUseCase = new UploadInvoiceDocumentUseCase({
    providerRepository,
    invoiceRepository,
    fileStorage,
    extractionAgent,
    auditLogger,
    dateProvider,
    invoiceIdGenerator,
    invoiceMovementIdGenerator,
    providerIdGenerator,
    ragReindexInvoiceService,
});

/* ============================================================================
 * COMPOSITION ROOT EXPORT
 * ============================================================================
 * Objeto singleton que expone todos los componentes ensamblados.
 * Este es el unico punto de acceso a las dependencias desde la capa HTTP.
 *
 * Uso:
 * ```typescript
 * import { compositionRoot } from '@composition/index.js';
 * const result = await compositionRoot.loginUserUseCase.execute({...});
 * ```
 *
 * Los tests NO deben importar este objeto. En su lugar, deben crear
 * sus propias dependencias con stubs/mocks.
 * ========================================================================= */

/**
 * Composition Root - Contenedor de dependencias de la aplicacion.
 *
 * Agrupa todos los repositorios, adaptadores y casos de uso listos para usar.
 * Implementa el patron Composition Root de Mark Seemann.
 *
 * @property {UserRepository} userRepository - Repositorio de usuarios
 * @property {SessionRepository} sessionRepository - Repositorio de sesiones
 * @property {LoginAttemptRepository} loginAttemptRepository - Repositorio de intentos de login
 * @property {ProviderRepository} providerRepository - Repositorio de proveedores
 * @property {InvoiceRepository} invoiceRepository - Repositorio de facturas
 * @property {FileStorage} fileStorage - Almacenamiento de archivos
 * @property {AuditLogger} auditLogger - Logger de auditoria
 * @property {DateProvider} dateProvider - Proveedor de fecha/hora
 * @property {UnitOfWork} unitOfWork - Unit of Work para transacciones (opcional)
 *
 * @see {@link https://blog.ploeh.dk/2011/07/28/CompositionRoot/}
 */
export const compositionRoot = {
    userRepository,
    sessionRepository,
    loginAttemptRepository,
    providerRepository,
    invoiceRepository,
    fileStorage,
    auditLogger,
    dateProvider,
    logger,
    userIdGenerator,
    invoiceIdGenerator,
    invoiceMovementIdGenerator,
    passwordHasher,
    refreshTokenHasher,
    tokenService,
    loginRateLimiter,
    unitOfWork,
    sessionIdGenerator,
    loginUserUseCase,
    createUserUseCase,
    listUsersUseCase,
    getUserDetailUseCase,
    updateUserUseCase,
    updateUserStatusUseCase,
    softDeleteUserUseCase,
    updateOwnProfileUseCase,
    revokeUserSessionsUseCase,
    changeUserPasswordUseCase,
    changeOwnPasswordUseCase,
    createProviderUseCase,
    listProvidersUseCase,
    getProviderDetailUseCase,
    updateProviderUseCase,
    updateProviderStatusUseCase,
    softDeleteProviderUseCase,
    createManualInvoiceUseCase,
    attachInvoiceFileUseCase,
    updateManualInvoiceUseCase,
    confirmInvoiceMovementsUseCase,
    confirmInvoiceHeaderUseCase,
    reprocessInvoiceExtractionUseCase,
    listInvoicesUseCase,
    getInvoiceDetailUseCase,
    softDeleteInvoiceUseCase,
    getInvoiceFileUseCase,
    uploadInvoiceDocumentUseCase,
    refreshAccessTokenUseCase,
    logoutUserUseCase,
    authorizeRequestUseCase,
    antiBruteForceUseCase,
    indexInvoicesForRagUseCase,
    queryInvoicesRagUseCase,
    processSearchQueryUseCase,
    getSearchResultUseCase,
    ragReindexAllInvoicesService,
};

/* ============================================================================
 * SEED DATA: DATOS DE PRUEBA
 * ============================================================================
 * Funcion para poblar datos iniciales cuando se usa almacenamiento in-memory.
 * Solo se ejecuta en desarrollo/testing, no afecta a bases de datos reales.
 * ========================================================================= */

/**
 * Pobla el repositorio con datos de prueba.
 *
 * Solo se ejecuta cuando DATABASE_TYPE es 'in-memory'.
 * Crea usuarios y proveedores de ejemplo para desarrollo y testing.
 *
 * **Usuarios creados:**
 * | Email               | Password       | Rol   |
 * |---------------------|----------------|-------|
 * | admin@example.com   | AdminPass1!a   | ADMIN |
 * | user@example.com    | UserPass1!a01  | USER  |
 *
 * **Proveedores creados:**
 * | Razon Social        | CIF       | Ubicacion  |
 * |---------------------|-----------|------------|
 * | Proveedor Alpha SL  | B12345678 | Madrid     |
 * | Proveedor Beta SL   | A87654321 | Barcelona  |
 *
 * @returns {Promise<void>}
 *
 * @example
 * import { seedUsers } from '@composition/index.js';
 *
 * // En el arranque del servidor (solo in-memory)
 * await seedUsers();
 */
export const seedUsers = async (): Promise<void> => {
    if (!(userRepository instanceof InMemoryUserRepository)) {
        return;
    }
    const now = new Date();
    const saltRounds = 12;
    const adminHash = await bcrypt.hash('AdminPass1!a', saltRounds);
    const userHash = await bcrypt.hash('UserPass1!a01', saltRounds);

    userRepository.add(
        User.create({
            id: 'admin-1',
            email: Email.create('admin@example.com'),
            passwordHash: adminHash,
            status: UserStatus.Active,
            roles: [UserRole.admin()],
            createdAt: now,
            updatedAt: now,
            name: 'Admin User'
        }),
    );

    userRepository.add(
        User.create({
            id: 'user-1',
            email: Email.create('user@example.com'),
            passwordHash: userHash,
            status: UserStatus.Active,
            roles: [UserRole.user()],
            createdAt: now,
            updatedAt: now,
            name: 'Regular User'
        }),
    );

    if (providerRepository instanceof InMemoryProviderRepository) {
        providerRepository.add(
            Provider.create({
                id: 'provider-1',
                razonSocial: 'Proveedor Alpha SL',
                cif: Cif.create('B12345678'),
                direccion: 'Calle Mayor 1',
                poblacion: 'Madrid',
                provincia: 'Madrid',
                pais: 'ES',
                status: ProviderStatus.Active,
                createdAt: now,
                updatedAt: now,
            }),
        );

        providerRepository.add(
            Provider.create({
                id: 'provider-2',
                razonSocial: 'Proveedor Beta SL',
                cif: Cif.create('A87654321'),
                direccion: 'Avenida Diagonal 100',
                poblacion: 'Barcelona',
                provincia: 'Barcelona',
                pais: 'ES',
                status: ProviderStatus.Active,
                createdAt: now,
                updatedAt: now,
            }),
        );
    }
};
