import { describe, expect, it } from 'vitest';
import { ReprocessInvoiceExtractionUseCase } from '../../../src/application/use-cases/reprocess-invoice-extraction.use-case.js';
import type { AuditEvent, AuditLogger } from '../../../src/application/ports/audit-logger.js';
import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import type { FileStorage } from '../../../src/application/ports/file-storage.js';
import type { InvoiceExtractionAgent } from '../../../src/application/ports/invoice-extraction-agent.js';
import type { InvoiceMovementIdGenerator } from '../../../src/application/ports/invoice-movement-id-generator.js';
import type { InvoiceRepository } from '../../../src/application/ports/invoice.repository.js';
import type { PortError } from '../../../src/application/errors/port.error.js';
import {
    Invoice,
    InvoiceHeaderSource,
    InvoiceHeaderStatus,
    InvoiceStatus,
} from '../../../src/domain/entities/invoice.entity.js';
import type { InvoiceProps } from '../../../src/domain/entities/invoice.entity.js';
import { InvoiceMovement, InvoiceMovementSource, InvoiceMovementStatus } from '../../../src/domain/entities/invoice-movement.entity.js';
import { FileRef } from '../../../src/domain/value-objects/file-ref.value-object.js';
import { InvoiceDate } from '../../../src/domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../../src/domain/value-objects/money.value-object.js';
import { ok, type Result } from '../../../src/shared/result.js';
import { RagReindexInvoiceServiceStub } from '../stubs/rag-reindex-invoice.service.stub.js';

const fixedNow = new Date('2026-03-04T10:00:00.000Z');

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

class InvoiceRepositoryStub implements InvoiceRepository {
    updatedInvoice: Invoice | null = null;

    constructor(private readonly invoice: Invoice | null) {}

    async create() {
        return ok(undefined);
    }

    async findById() {
        return ok(this.invoice);
    }

    async update(invoice: Invoice) {
        this.updatedInvoice = invoice;
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
            storageKey: 'invoices/2026/03/fac-1.pdf',
            filename: 'invoice.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 10,
            checksum: 'checksum-1',
        });
    }

    async delete() {
        return ok(undefined);
    }

    async get() {
        return ok({
            storageKey: 'invoices/2026/03/fac-1.pdf',
            filename: 'invoice.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 10,
            content: Buffer.from('pdf-content'),
        });
    }
}

class ExtractionAgentStub implements InvoiceExtractionAgent {
    async extract() {
        return ok({
            providerCif: 'B12345678',
            invoice: {
                numeroFactura: 'FAC-REPROCESADA',
                fechaOperacion: '2026-03-03',
                baseImponible: 200,
                iva: 42,
                total: 242,
                movements: [
                    {
                        concepto: 'AI nuevo',
                        cantidad: 2,
                        precio: 100,
                        baseImponible: 200,
                        iva: 42,
                        total: 242,
                    },
                ],
            },
            missingFields: [],
        });
    }
}

const createInvoice = (overrides: Partial<InvoiceProps> = {}): Invoice =>
    Invoice.create({
        id: 'invoice-1',
        providerId: 'provider-1',
        status: InvoiceStatus.Active,
        headerSource: InvoiceHeaderSource.Ai,
        headerStatus: InvoiceHeaderStatus.Proposed,
        numeroFactura: 'FAC-2026-OLD',
        fechaOperacion: InvoiceDate.create('2026-02-20'),
        baseImponible: Money.create(100),
        iva: Money.create(21),
        total: Money.create(121),
        fileRef: FileRef.create({
            storageKey: 'invoices/2026/03/fac-1.pdf',
            filename: 'invoice.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 10,
            checksum: 'checksum-1',
        }),
        movements: [
            InvoiceMovement.create({
                id: 'movement-manual',
                concepto: 'Manual',
                cantidad: 1,
                precio: 100,
                baseImponible: 100,
                iva: 21,
                total: 121,
                source: InvoiceMovementSource.Manual,
                status: InvoiceMovementStatus.Confirmed,
            }),
            InvoiceMovement.create({
                id: 'movement-ai',
                concepto: 'AI viejo',
                cantidad: 1,
                precio: 100,
                baseImponible: 100,
                iva: 21,
                total: 121,
                source: InvoiceMovementSource.Ai,
                status: InvoiceMovementStatus.Proposed,
            }),
        ],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        ...overrides,
    });

describe('ReprocessInvoiceExtractionUseCase', () => {
    it('updates AI proposed header and movements while keeping manual confirmed', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(createInvoice());
        const fileStorage = new FileStorageStub();
        const extractionAgent = new ExtractionAgentStub();
        const auditLogger = new AuditLoggerSpy();
        const movementIdGenerator = new InvoiceMovementIdGeneratorStub(['movement-ai-new']);

        const useCase = new ReprocessInvoiceExtractionUseCase({
            invoiceRepository,
            fileStorage,
            extractionAgent,
            auditLogger,
            dateProvider: new DateProviderStub(),
            invoiceMovementIdGenerator: movementIdGenerator,
            ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
        });

        expect(result.success).toBe(true);
        const updated = invoiceRepository.updatedInvoice;
        expect(updated?.numeroFactura).toBe('FAC-REPROCESADA');
        expect(updated?.headerSource).toBe(InvoiceHeaderSource.Ai);
        expect(updated?.headerStatus).toBe(InvoiceHeaderStatus.Proposed);
        const manualMovement = updated?.movements.find((m) => m.id === 'movement-manual');
        expect(manualMovement?.concepto).toBe('Manual');
        const aiMovement = updated?.movements.find((m) => m.source === InvoiceMovementSource.Ai);
        expect(aiMovement?.concepto).toBe('AI nuevo');
        expect(aiMovement?.status).toBe(InvoiceMovementStatus.Proposed);
        expect(auditLogger.events.some((event) => event.action === 'INVOICE_REPROCESSED')).toBe(true);
    });

    it('keeps confirmed manual header values', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(
            createInvoice({
                headerSource: InvoiceHeaderSource.Manual,
                headerStatus: InvoiceHeaderStatus.Confirmed,
                numeroFactura: 'MAN-1',
            }),
        );
        const fileStorage = new FileStorageStub();
        const extractionAgent = new ExtractionAgentStub();
        const auditLogger = new AuditLoggerSpy();
        const movementIdGenerator = new InvoiceMovementIdGeneratorStub(['movement-ai-new']);

        const useCase = new ReprocessInvoiceExtractionUseCase({
            invoiceRepository,
            fileStorage,
            extractionAgent,
            auditLogger,
            dateProvider: new DateProviderStub(),
            invoiceMovementIdGenerator: movementIdGenerator,
            ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
        });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            invoiceId: 'invoice-1',
        });

        expect(result.success).toBe(true);
        const updated = invoiceRepository.updatedInvoice;
        expect(updated?.numeroFactura).toBe('MAN-1');
        expect(updated?.headerSource).toBe(InvoiceHeaderSource.Manual);
        expect(updated?.headerStatus).toBe(InvoiceHeaderStatus.Confirmed);
    });
});
