import { describe, expect, it } from 'vitest';
import { UploadInvoiceDocumentUseCase } from '../../../src/application/use-cases/upload-invoice-document.use-case.js';
import type { InvoiceRepository } from '../../../src/application/ports/invoice.repository.js';
import type { FileStorage } from '../../../src/application/ports/file-storage.js';
import type { InvoiceExtractionAgent, InvoiceExtractionResult } from '../../../src/application/ports/invoice-extraction-agent.js';
import type { InvoiceIdGenerator } from '../../../src/application/ports/invoice-id-generator.js';
import type { InvoiceMovementIdGenerator } from '../../../src/application/ports/invoice-movement-id-generator.js';
import type { ProviderRepository } from '../../../src/application/ports/provider.repository.js';
import type { ProviderIdGenerator } from '../../../src/application/ports/provider-id-generator.js';
import type { AuditEvent, AuditLogger } from '../../../src/application/ports/audit-logger.js';
import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import type { PortError } from '../../../src/application/errors/port.error.js';
import { Provider, ProviderStatus } from '../../../src/domain/entities/provider.entity.js';
import { ok, type Result } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-24T10:00:00.000Z');

class DateProviderStub implements DateProvider {
    now(): Result<Date, PortError> {
        return ok(fixedNow);
    }
}

class AuditLoggerSpy implements AuditLogger {
    events: AuditEvent[] = [];

    async log(event: AuditEvent) {
        this.events.push(event);
        return ok(undefined);
    }
}

class InvoiceIdGeneratorStub implements InvoiceIdGenerator {
    constructor(private readonly id: string) {}

    generate(): string {
        return this.id;
    }
}

class InvoiceMovementIdGeneratorStub implements InvoiceMovementIdGenerator {
    private readonly ids: string[];

    constructor(ids: string[]) {
        this.ids = [...ids];
    }

    generate(): string {
        const id = this.ids.shift();
        return id ?? 'movement-fallback';
    }
}

class ProviderRepositoryStub implements ProviderRepository {
    constructor(private readonly provider: Provider | null) {}

    async findById() {
        return ok(this.provider);
    }

    async list() {
        return ok({ items: [], total: 0 });
    }

    async create() {
        return ok(undefined);
    }

    async update() {
        return ok(undefined);
    }

    async findByCif() {
        return ok(this.provider);
    }

    async findByRazonSocialNormalized() {
        return ok(null);
    }
}

class InvoiceRepositorySpy implements InvoiceRepository {
    createdInvoice = null as unknown;

    async create(invoice: unknown) {
        this.createdInvoice = invoice;
        return ok(undefined);
    }

    async findById() {
        return ok(null);
    }

    async update() {
        return ok(undefined);
    }

    async list() {
        return ok({ items: [], total: 0 });
    }

    async getDetail() {
        return ok(null);
    }
}

class FileStorageStub implements FileStorage {
    async store() {
        return ok({
            storageKey: 'invoices/2026/02/invoice-1.pdf',
            filename: 'invoice-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1234,
            checksum: 'checksum-1',
        });
    }

    async delete() {
        return ok(undefined);
    }

    async get() {
        return ok({
            storageKey: 'invoices/2026/02/invoice-1.pdf',
            filename: 'invoice-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1234,
            content: Buffer.from('pdf-content'),
        });
    }
}

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

describe('UploadInvoiceDocumentUseCase', () => {
    it('creates invoice when provider is found', async () => {
        const providerRepository = new ProviderRepositoryStub(createProvider());
        const invoiceRepository = new InvoiceRepositorySpy();
        const fileStorage = new FileStorageStub();
        const extractionAgent = new ExtractionAgentStub();
        const auditLogger = new AuditLoggerSpy();
        const invoiceIdGenerator = new InvoiceIdGeneratorStub('invoice-fixed');
        const invoiceMovementIdGenerator = new InvoiceMovementIdGeneratorStub(['movement-1']);
        const providerIdGenerator = new ProviderIdGeneratorStub('provider-fixed');

        const useCase = new UploadInvoiceDocumentUseCase({
            providerRepository,
            invoiceRepository,
            fileStorage,
            extractionAgent,
            auditLogger,
            dateProvider: new DateProviderStub(),
            invoiceIdGenerator,
            invoiceMovementIdGenerator,
            providerIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            file: {
                filename: 'invoice-1.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1234,
                checksum: 'checksum-1',
                content: Buffer.from('pdf-content'),
            },
        });

        expect(result.success).toBe(true);
        expect(invoiceRepository.createdInvoice).not.toBeNull();
    });

    it('creates invoice when provider is not found', async () => {
        const providerRepository = new ProviderRepositoryStub(null);
        const invoiceRepository = new InvoiceRepositorySpy();
        const fileStorage = new FileStorageStub();
        const extractionAgent = new ExtractionAgentErrorStub();
        const auditLogger = new AuditLoggerSpy();
        const invoiceIdGenerator = new InvoiceIdGeneratorStub('invoice-fixed');
        const invoiceMovementIdGenerator = new InvoiceMovementIdGeneratorStub(['movement-1']);
        const providerIdGenerator = new ProviderIdGeneratorStub('provider-fixed');

        const useCase = new UploadInvoiceDocumentUseCase({
            providerRepository,
            invoiceRepository,
            fileStorage,
            extractionAgent,
            auditLogger,
            dateProvider: new DateProviderStub(),
            invoiceIdGenerator,
            invoiceMovementIdGenerator,
            providerIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            file: {
                filename: 'invoice-1.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1234,
                checksum: 'checksum-1',
                content: Buffer.from('pdf-content'),
            },
        });

        expect(result.success).toBe(true);
        expect(invoiceRepository.createdInvoice).not.toBeNull();
    });

    it('creates invoice with inconsistent status when totals mismatch', async () => {
        const providerRepository = new ProviderRepositoryStub(createProvider());
        const invoiceRepository = new InvoiceRepositorySpy();
        const fileStorage = new FileStorageStub();
        const extractionAgent = new ExtractionAgentTotalsMismatchStub();
        const auditLogger = new AuditLoggerSpy();
        const invoiceIdGenerator = new InvoiceIdGeneratorStub('invoice-fixed');
        const invoiceMovementIdGenerator = new InvoiceMovementIdGeneratorStub(['movement-1']);
        const providerIdGenerator = new ProviderIdGeneratorStub('provider-fixed');

        const useCase = new UploadInvoiceDocumentUseCase({
            providerRepository,
            invoiceRepository,
            fileStorage,
            extractionAgent,
            auditLogger,
            dateProvider: new DateProviderStub(),
            invoiceIdGenerator,
            invoiceMovementIdGenerator,
            providerIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            file: {
                filename: 'invoice-1.pdf',
                mimeType: 'application/pdf',
                sizeBytes: 1234,
                checksum: 'checksum-1',
                content: Buffer.from('pdf-content'),
            },
        });

        expect(result.success).toBe(true);
        expect(invoiceRepository.createdInvoice).not.toBeNull();
        const createdInvoice = invoiceRepository.createdInvoice as { status?: string };
        expect(createdInvoice.status).toBe('INCONSISTENT');
    });
});
