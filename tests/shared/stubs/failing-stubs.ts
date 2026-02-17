/**
 * Failing Stubs - Shared test doubles that always return PortError
 *
 * Use these stubs to test error propagation in use cases.
 * Each stub implements the corresponding port interface and returns a failure.
 *
 * @example
 * ```typescript
 * import { FailingDateProvider, FailingAuditLogger } from '@tests/shared/stubs/failing-stubs.js';
 *
 * describe('PortError propagation', () => {
 *     it('propagates DateProvider error', async () => {
 *         const sut = createSut({ dateProvider: new FailingDateProvider() });
 *         const result = await sut.execute(validRequest);
 *         expect(result.success).toBe(false);
 *         expect(result.error).toBeInstanceOf(PortError);
 *         expect((result.error as PortError).port).toBe('DateProvider');
 *     });
 * });
 * ```
 */

import type { DateProvider } from '@application/ports/date-provider.js';
import type { AuditLogger, AuditEvent } from '@application/ports/audit-logger.js';
import type { PasswordHasher } from '@application/ports/password-hasher.js';
import type { RefreshTokenHasher } from '@application/ports/refresh-token-hasher.js';
import type { LoginRateLimiter } from '@application/ports/login-rate-limiter.js';
import type { FileStorage, FileToStore, StoredFile, StoredFileContent } from '@application/ports/file-storage.js';
import type { InvoiceExtractionAgent, InvoiceExtractionResult } from '@application/ports/invoice-extraction-agent.js';
import type { RagReindexInvoiceHandler } from '@application/services/rag-reindex-invoice.service.js';
import type { UserRepository } from '@application/ports/user.repository.js';
import type { SessionRepository } from '@application/ports/session.repository.js';
import type { LoginAttemptRepository, LoginAttemptKey } from '@application/ports/login-attempt.repository.js';
import type {
    ProviderRepository,
    ProviderListFilters,
    ProviderListResult,
} from '@application/ports/provider.repository.js';
import type { InvoiceRepository, InvoiceListFilters, InvoiceListResult } from '@application/ports/invoice.repository.js';
import type { User, UserStatus } from '@domain/entities/user.entity.js';
import type { UserRole } from '@domain/value-objects/user-role.value-object.js';
import type { Session } from '@domain/entities/session.entity.js';
import type { Provider } from '@domain/entities/provider.entity.js';
import type { Invoice } from '@domain/entities/invoice.entity.js';
import type { PortError } from '@application/errors/port.error.js';
import type { AuthRateLimitedError } from '@domain/errors/auth-rate-limited.error.js';
import { PortError as PortErrorClass } from '@application/errors/port.error.js';
import { fail, type Result } from '@shared/result.js';

// =============================================================================
// Core Infrastructure Stubs
// =============================================================================

export class FailingDateProvider implements DateProvider {
    private readonly portName = 'DateProvider';
    private readonly errorMessage: string;

    constructor(errorMessage = 'Clock sync error') {
        this.errorMessage = errorMessage;
    }

    now(): Result<Date, PortError> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }
}

export class FailingAuditLogger implements AuditLogger {
    private readonly portName = 'AuditLogger';
    private readonly errorMessage: string;

    constructor(errorMessage = 'Audit service unavailable') {
        this.errorMessage = errorMessage;
    }

    async log(_event: AuditEvent): Promise<Result<void, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }
}

export class FailingPasswordHasher implements PasswordHasher {
    private readonly portName = 'PasswordHasher';
    private readonly errorMessage: string;

    constructor(errorMessage = 'Hash service unavailable') {
        this.errorMessage = errorMessage;
    }

    async hash(_password: string): Promise<Result<string, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async verify(_password: string, _hash: string): Promise<Result<boolean, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }
}

export class FailingRefreshTokenHasher implements RefreshTokenHasher {
    private readonly portName = 'RefreshTokenHasher';
    private readonly errorMessage: string;

    constructor(errorMessage = 'Token hash error') {
        this.errorMessage = errorMessage;
    }

    hash(_value: string): Result<string, PortError> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }
}

export class FailingRateLimiter implements LoginRateLimiter {
    private readonly portName = 'LoginRateLimiter';
    private readonly errorMessage: string;

    constructor(errorMessage = 'Rate limiter unavailable') {
        this.errorMessage = errorMessage;
    }

    async assertAllowed(_email: string, _ip?: string): Promise<Result<void, AuthRateLimitedError | PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }
}

// =============================================================================
// File & AI Stubs
// =============================================================================

export class FailingFileStorage implements FileStorage {
    private readonly portName = 'FileStorage';
    private readonly errorMessage: string;

    constructor(errorMessage = 'Storage unavailable') {
        this.errorMessage = errorMessage;
    }

    async store(_file: FileToStore): Promise<Result<StoredFile, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async get(_storageKey: string): Promise<Result<StoredFileContent, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async delete(_storageKey: string): Promise<Result<void, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }
}

export class FailingExtractionAgent implements InvoiceExtractionAgent {
    private readonly portName = 'InvoiceExtractionAgent';
    private readonly errorMessage: string;

    constructor(errorMessage = 'Extraction failed') {
        this.errorMessage = errorMessage;
    }

    async extract(
        _file: { content: Buffer; filename: string; mimeType: string },
    ): Promise<Result<InvoiceExtractionResult, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }
}

export class FailingRagReindexService implements RagReindexInvoiceHandler {
    private readonly portName = 'RagReindexService';
    private readonly errorMessage: string;

    constructor(errorMessage = 'Reindex failed') {
        this.errorMessage = errorMessage;
    }

    async reindex(_invoiceId: string): Promise<Result<void, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }
}

// =============================================================================
// Repository Stubs
// =============================================================================

export class FailingUserRepository implements UserRepository {
    private readonly portName = 'UserRepository';
    private readonly errorMessage: string;

    constructor(errorMessage = 'Database error') {
        this.errorMessage = errorMessage;
    }

    async findById(_id: string): Promise<Result<User | null, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async findByEmail(_email: string): Promise<Result<User | null, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async create(_user: User): Promise<Result<void, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async update(_user: User): Promise<Result<void, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async list(
        _filter: { status?: UserStatus; role?: UserRole; page: number; pageSize: number },
    ): Promise<Result<{ items: User[]; total: number }, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }
}

export class FailingSessionRepository implements SessionRepository {
    private readonly portName = 'SessionRepository';
    private readonly errorMessage: string;

    constructor(errorMessage = 'Database error') {
        this.errorMessage = errorMessage;
    }

    async findByRefreshTokenHash(_hash: string): Promise<Result<Session | null, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async create(_session: Session): Promise<Result<void, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async update(_session: Session): Promise<Result<void, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async revokeByUserId(_userId: string): Promise<Result<void, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }
}

export class FailingLoginAttemptRepository implements LoginAttemptRepository {
    private readonly portName = 'LoginAttemptRepository';
    private readonly errorMessage: string;

    constructor(errorMessage = 'Database error') {
        this.errorMessage = errorMessage;
    }

    async countFailedAttempts(_key: LoginAttemptKey, _windowMinutes: number): Promise<Result<number, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async recordAttempt(_key: LoginAttemptKey, _succeeded: boolean, _timestamp: Date): Promise<Result<void, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }
}

export class FailingProviderRepository implements ProviderRepository {
    private readonly portName = 'ProviderRepository';
    private readonly errorMessage: string;

    constructor(errorMessage = 'Database error') {
        this.errorMessage = errorMessage;
    }

    async findById(_id: string): Promise<Result<Provider | null, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async findByCif(_cif: string): Promise<Result<Provider | null, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async findByRazonSocialNormalized(_normalized: string): Promise<Result<Provider | null, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async create(_provider: Provider): Promise<Result<void, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async update(_provider: Provider): Promise<Result<void, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async list(_filters: ProviderListFilters): Promise<Result<ProviderListResult, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }
}

export class FailingInvoiceRepository implements InvoiceRepository {
    private readonly portName = 'InvoiceRepository';
    private readonly errorMessage: string;

    constructor(errorMessage = 'Database error') {
        this.errorMessage = errorMessage;
    }

    async findById(_id: string): Promise<Result<Invoice | null, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async create(_invoice: Invoice): Promise<Result<void, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async update(_invoice: Invoice): Promise<Result<void, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async list(_filters: InvoiceListFilters): Promise<Result<InvoiceListResult, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }

    async getDetail(_invoiceId: string): Promise<Result<Invoice | null, PortError>> {
        return fail(new PortErrorClass(this.portName, this.errorMessage));
    }
}
