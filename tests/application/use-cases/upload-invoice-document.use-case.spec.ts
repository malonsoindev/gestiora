import { describe, expect, it } from 'vitest';
import { UploadInvoiceDocumentUseCase } from '@application/use-cases/upload-invoice-document.use-case.js';
import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { FileStorage } from '@application/ports/file-storage.js';
import type { InvoiceExtractionAgent, InvoiceExtractionResult } from '@application/ports/invoice-extraction-agent.js';
import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import type { ProviderRepository } from '@application/ports/provider.repository.js';
import type { RagReindexInvoiceHandler } from '@application/services/rag-reindex-invoice.service.js';
import { PortError } from '@application/errors/port.error.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { fail, ok, type Result } from '@shared/result.js';
import { RagReindexInvoiceServiceStub } from '@tests/shared/stubs/rag-reindex-invoice.service.stub.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { IdGeneratorStub } from '@tests/shared/stubs/id-generator.stub.js';
import { ProviderRepositoryStub } from '@tests/shared/stubs/provider-repository.stub.js';
import { FileStorageStub } from '@tests/shared/stubs/file-storage.stub.js';
import { InvoiceRepositorySpy } from '@tests/shared/spies/invoice-repository.spy.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { fixedNow } from '@tests/shared/fixed-now.js';
import { createTestProvider } from '@tests/shared/fixtures/provider.fixture.js';
import {
    FailingDateProvider,
    FailingExtractionAgent,
    FailingFileStorage,
    FailingInvoiceRepository,
    FailingAuditLogger,
} from '@tests/shared/stubs/failing-stubs.js';

class ExtractionAgentStub implements InvoiceExtractionAgent {
    async extract(): Promise<Result<InvoiceExtractionResult, PortError>> {
        return ok({
            providerCif: 'B12345678',
            provider: {
                razonSocial: 'Proveedor Demo',
                direccion: 'Calle 1',
                poblacion: 'Valencia',
                provincia: 'Valencia',
                pais: 'ES',
            },
            invoice: {
                numeroFactura: 'FAC-2026-0001',
                fechaOperacion: '2026-02-10',
                fechaVencimiento: '2026-03-10',
                baseImponible: 300,
                iva: 63,
                total: 363,
                movements: [
                    {
                        concepto: 'Servicio',
                        cantidad: 1,
                        precio: 300,
                        baseImponible: 300,
                        iva: 63,
                        total: 363,
                    },
                ],
            },
            missingFields: [],
        });
    }
}

class ExtractionAgentErrorStub implements InvoiceExtractionAgent {
    async extract(): Promise<Result<InvoiceExtractionResult, PortError>> {
        return ok({
            providerCif: 'B12345678',
            provider: {
                razonSocial: 'Proveedor Demo',
            },
            invoice: {
                numeroFactura: 'FAC-2026-0001',
                fechaOperacion: '2026-02-10',
                baseImponible: 300,
                iva: 63,
                total: 363,
                movements: [
                    {
                        concepto: 'Servicio',
                        cantidad: 1,
                        precio: 300,
                        total: 363,
                    },
                ],
            },
            missingFields: ['fechaVencimiento'],
        });
    }
}

class ExtractionAgentTotalsMismatchStub implements InvoiceExtractionAgent {
    async extract(): Promise<Result<InvoiceExtractionResult, PortError>> {
        return ok({
            providerCif: 'B12345678',
            provider: {
                razonSocial: 'Proveedor Demo',
            },
            invoice: {
                numeroFactura: 'FAC-2026-0002',
                fechaOperacion: '2026-02-10',
                baseImponible: 300,
                iva: 63,
                total: 363,
                movements: [
                    {
                        concepto: 'Servicio',
                        cantidad: 1,
                        precio: 300,
                        baseImponible: 300,
                        iva: 63,
                        total: 400,
                    },
                ],
            },
            missingFields: [],
        });
    }
}

// ========== Local PortError Stubs (with specific logic not suitable for centralization) ==========

class FailingProviderRepositoryOnMethod implements ProviderRepository {
    private readonly failOn: 'findByCif' | 'create';

    constructor(failOn: 'findByCif' | 'create' = 'findByCif') {
        this.failOn = failOn;
    }

    async findByCif() {
        if (this.failOn === 'findByCif') {
            return fail(new PortError('ProviderRepository', 'Database connection lost'));
        }
        return ok(null);
    }

    async findById() {
        return ok(null);
    }

    async findByRazonSocialNormalized() {
        return ok(null);
    }

    async create() {
        if (this.failOn === 'create') {
            return fail(new PortError('ProviderRepository', 'Database write failed'));
        }
        return ok(undefined);
    }

    async update() {
        return ok(undefined);
    }

    async list() {
        return ok({ items: [], total: 0 });
    }
}

// Local stub with different port name (RagReindexInvoiceService vs RagReindexService)
class FailingRagReindexServiceLocal implements RagReindexInvoiceHandler {
    async reindex() {
        return fail(new PortError('RagReindexInvoiceService', 'RAG service unavailable'));
    }
}

const createProvider = (): Provider =>
    createTestProvider({
        now: fixedNow,
        overrides: {
            razonSocial: 'Proveedor Uno',
            status: ProviderStatus.Active,
        },
    });

const fileInput = {
    filename: 'invoice-1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1234,
    checksum: 'checksum-1',
    content: Buffer.from('pdf-content'),
};

type SutOverrides = Partial<{
    provider: Provider | null;
    extractionAgent: InvoiceExtractionAgent;
    invoiceId: string;
    movementIds: string[];
    providerId: string;
    now: Date;
    fileStorage: FileStorage;
    dateProvider: DateProvider;
    providerRepository: ProviderRepository;
    invoiceRepository: InvoiceRepository;
    auditLogger: AuditLogger;
    ragReindexInvoiceService: RagReindexInvoiceHandler;
}>;

const makeSut = (overrides: SutOverrides = {}): {
    useCase: UploadInvoiceDocumentUseCase;
    providerRepository: ProviderRepository;
    invoiceRepository: InvoiceRepositorySpy;
    fileStorage: FileStorage;
    auditLogger: AuditLogger;
} => {
    const now = overrides.now ?? fixedNow;
    const provider = overrides.provider === undefined ? createProvider() : overrides.provider;
    const providerRepository = overrides.providerRepository ?? new ProviderRepositoryStub(provider);
    const invoiceRepository = (overrides.invoiceRepository ?? new InvoiceRepositorySpy()) as InvoiceRepositorySpy;
    const fileStorage = overrides.fileStorage ?? new FileStorageStub();
    const extractionAgent = overrides.extractionAgent ?? new ExtractionAgentStub();
    const auditLogger = overrides.auditLogger ?? new AuditLoggerSpy();
    const dateProvider = overrides.dateProvider ?? new DateProviderStub(now);
    const ragReindexInvoiceService = overrides.ragReindexInvoiceService ?? new RagReindexInvoiceServiceStub();

    const useCase = new UploadInvoiceDocumentUseCase({
        providerRepository,
        invoiceRepository,
        fileStorage,
        extractionAgent,
        auditLogger,
        dateProvider,
        invoiceIdGenerator: new IdGeneratorStub(overrides.invoiceId ?? 'invoice-fixed'),
        invoiceMovementIdGenerator: new IdGeneratorStub(overrides.movementIds ?? ['movement-1'], 'movement-fallback'),
        providerIdGenerator: new IdGeneratorStub(overrides.providerId ?? 'provider-fixed'),
        ragReindexInvoiceService,
    });

    return { useCase, providerRepository, invoiceRepository, fileStorage, auditLogger };
};

const baseCommand = {
    actorUserId: 'user-1',
    file: fileInput,
};

describe('UploadInvoiceDocumentUseCase', () => {
    it('creates invoice when provider is found', async () => {
        const { useCase, invoiceRepository } = makeSut();

        const result = await useCase.execute(baseCommand);

        expect(result.success).toBe(true);
        expect(invoiceRepository.createdInvoice).not.toBeNull();
    });

    it('creates invoice when provider is not found', async () => {
        const { useCase, invoiceRepository } = makeSut({
            provider: null,
            extractionAgent: new ExtractionAgentErrorStub(),
        });

        const result = await useCase.execute(baseCommand);

        expect(result.success).toBe(true);
        expect(invoiceRepository.createdInvoice).not.toBeNull();
    });

    it('creates invoice with inconsistent status when totals mismatch', async () => {
        const { useCase, invoiceRepository } = makeSut({
            extractionAgent: new ExtractionAgentTotalsMismatchStub(),
        });

        const result = await useCase.execute(baseCommand);

        expect(result.success).toBe(true);
        expect(invoiceRepository.createdInvoice).not.toBeNull();
        const createdInvoice = invoiceRepository.createdInvoice as { status?: string };
        expect(createdInvoice.status).toBe('INCONSISTENT');
    });

    describe('PortError propagation', () => {
        it('propagates PortError when DateProvider.now fails', async () => {
            const { useCase } = makeSut({
                dateProvider: new FailingDateProvider(),
            });

            const result = await useCase.execute(baseCommand);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('DateProvider');
            }
        });

        it('propagates PortError when InvoiceExtractionAgent.extract fails', async () => {
            const { useCase } = makeSut({
                extractionAgent: new FailingExtractionAgent(),
            });

            const result = await useCase.execute(baseCommand);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('InvoiceExtractionAgent');
            }
        });

        it('propagates PortError when ProviderRepository.findByCif fails', async () => {
            const { useCase } = makeSut({
                providerRepository: new FailingProviderRepositoryOnMethod('findByCif'),
            });

            const result = await useCase.execute(baseCommand);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('ProviderRepository');
            }
        });

        it('propagates PortError when ProviderRepository.create fails for draft provider', async () => {
            const { useCase } = makeSut({
                provider: null,
                providerRepository: new FailingProviderRepositoryOnMethod('create'),
            });

            const result = await useCase.execute(baseCommand);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('ProviderRepository');
            }
        });

        it('propagates PortError when FileStorage.store fails', async () => {
            const { useCase } = makeSut({
                fileStorage: new FailingFileStorage(),
            });

            const result = await useCase.execute(baseCommand);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('FileStorage');
            }
        });

        it('propagates PortError when InvoiceRepository.create fails', async () => {
            const { useCase } = makeSut({
                invoiceRepository: new FailingInvoiceRepository(),
            });

            const result = await useCase.execute(baseCommand);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('InvoiceRepository');
            }
        });

        it('propagates PortError when AuditLogger.log fails', async () => {
            const { useCase } = makeSut({
                auditLogger: new FailingAuditLogger(),
            });

            const result = await useCase.execute(baseCommand);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('AuditLogger');
            }
        });

        it('propagates PortError when RagReindexInvoiceService.reindex fails', async () => {
            const { useCase } = makeSut({
                ragReindexInvoiceService: new FailingRagReindexServiceLocal(),
            });

            const result = await useCase.execute(baseCommand);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('RagReindexInvoiceService');
            }
        });
    });
});
