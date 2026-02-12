import { describe, expect, it } from 'vitest';
import { UploadInvoiceDocumentUseCase } from '@application/use-cases/upload-invoice-document.use-case.js';
import type { FileStorage } from '@application/ports/file-storage.js';
import type { InvoiceExtractionAgent, InvoiceExtractionResult } from '@application/ports/invoice-extraction-agent.js';
import type { ProviderIdGenerator } from '@application/ports/provider-id-generator.js';
import type { PortError } from '@application/errors/port.error.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { ok, type Result } from '@shared/result.js';
import { RagReindexInvoiceServiceStub } from '../stubs/rag-reindex-invoice.service.stub.js';
import { DateProviderStub } from '../../shared/stubs/date-provider.stub.js';
import { InvoiceIdGeneratorStub } from '../../shared/stubs/invoice-id-generator.stub.js';
import { InvoiceMovementIdGeneratorStub } from '../../shared/stubs/invoice-movement-id-generator.stub.js';
import { ProviderRepositoryStub } from '../../shared/stubs/provider-repository.stub.js';
import { FileStorageStub } from '../../shared/stubs/file-storage.stub.js';
import { InvoiceRepositorySpy } from '../../shared/spies/invoice-repository.spy.js';
import { AuditLoggerSpy } from '../../shared/spies/audit-logger.spy.js';
import { fixedNow } from '../../shared/fixed-now.js';

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

class ProviderIdGeneratorStub implements ProviderIdGenerator {
    constructor(private readonly id: string) {}

    generate(): string {
        return this.id;
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

const createProvider = (): Provider =>
    Provider.create({
        id: 'provider-1',
        razonSocial: 'Proveedor Uno',
        status: ProviderStatus.Active,
        createdAt: fixedNow,
        updatedAt: fixedNow,
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
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const now = overrides.now ?? fixedNow;
    const provider = overrides.provider === undefined ? createProvider() : overrides.provider;
    const providerRepository = new ProviderRepositoryStub(provider);
    const invoiceRepository = new InvoiceRepositorySpy();
    const fileStorage = overrides.fileStorage ?? new FileStorageStub();
    const extractionAgent = overrides.extractionAgent ?? new ExtractionAgentStub();
    const auditLogger = new AuditLoggerSpy();

    const useCase = new UploadInvoiceDocumentUseCase({
        providerRepository,
        invoiceRepository,
        fileStorage,
        extractionAgent,
        auditLogger,
        dateProvider: new DateProviderStub(now),
        invoiceIdGenerator: new InvoiceIdGeneratorStub(overrides.invoiceId ?? 'invoice-fixed'),
        invoiceMovementIdGenerator: new InvoiceMovementIdGeneratorStub(overrides.movementIds ?? ['movement-1']),
        providerIdGenerator: new ProviderIdGeneratorStub(overrides.providerId ?? 'provider-fixed'),
        ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
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
});
