import { describe, expect, it } from 'vitest';
import { ReprocessInvoiceExtractionUseCase } from '@application/use-cases/reprocess-invoice-extraction.use-case.js';
import type { FileStorage } from '@application/ports/file-storage.js';
import type { InvoiceExtractionAgent } from '@application/ports/invoice-extraction-agent.js';
import {
    Invoice,
    InvoiceHeaderSource,
    InvoiceHeaderStatus,
    InvoiceStatus,
} from '@domain/entities/invoice.entity.js';
import type { InvoiceProps } from '@domain/entities/invoice.entity.js';
import { InvoiceMovement, InvoiceMovementSource, InvoiceMovementStatus } from '@domain/entities/invoice-movement.entity.js';
import { FileRef } from '@domain/value-objects/file-ref.value-object.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { ok } from '@shared/result.js';
import { RagReindexInvoiceServiceStub } from '@tests/shared/stubs/rag-reindex-invoice.service.stub.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { InvoiceMovementIdGeneratorStub } from '@tests/shared/stubs/invoice-movement-id-generator.stub.js';
import { InvoiceRepositoryStub } from '@tests/shared/stubs/invoice-repository.stub.js';
import { FileStorageStub } from '@tests/shared/stubs/file-storage.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { fixedNow } from '@tests/shared/fixed-now.js';
import { createTestInvoice } from '@tests/shared/fixtures/invoice.fixture.js';

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
    createTestInvoice({
        now: fixedNow,
        overrides: {
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
            ...overrides,
        },
    });

const fileStorageOptions = {
    storeResult: {
        storageKey: 'invoices/2026/03/fac-1.pdf',
        filename: 'invoice.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        checksum: 'checksum-1',
    },
    getResult: {
        storageKey: 'invoices/2026/03/fac-1.pdf',
        filename: 'invoice.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        content: Buffer.from('pdf-content'),
    },
};

type SutOverrides = Partial<{
    invoice: Invoice | null;
    now: Date;
    extractionAgent: InvoiceExtractionAgent;
    movementIds: string[];
    fileStorage: FileStorage;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const now = overrides.now ?? fixedNow;
    const invoice = overrides.invoice === undefined ? createInvoice() : overrides.invoice;
    const invoiceRepository = new InvoiceRepositoryStub(invoice);
    const fileStorage = overrides.fileStorage ?? new FileStorageStub(fileStorageOptions);
    const extractionAgent = overrides.extractionAgent ?? new ExtractionAgentStub();
    const auditLogger = new AuditLoggerSpy();
    const invoiceMovementIdGenerator = new InvoiceMovementIdGeneratorStub(overrides.movementIds ?? ['movement-ai-new']);

    const useCase = new ReprocessInvoiceExtractionUseCase({
        invoiceRepository,
        fileStorage,
        extractionAgent,
        auditLogger,
        dateProvider: new DateProviderStub(now),
        invoiceMovementIdGenerator,
        ragReindexInvoiceService: new RagReindexInvoiceServiceStub(),
    });

    return { useCase, invoiceRepository, fileStorage, auditLogger };
};

const baseCommand = {
    actorUserId: 'user-1',
    invoiceId: 'invoice-1',
};

describe('ReprocessInvoiceExtractionUseCase', () => {
    it('updates AI proposed header and movements while keeping manual confirmed', async () => {
        const { useCase, invoiceRepository, auditLogger } = makeSut();

        const result = await useCase.execute(baseCommand);

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
        const { useCase, invoiceRepository } = makeSut({
            invoice: createInvoice({
                headerSource: InvoiceHeaderSource.Manual,
                headerStatus: InvoiceHeaderStatus.Confirmed,
                numeroFactura: 'MAN-1',
            }),
        });

        const result = await useCase.execute(baseCommand);

        expect(result.success).toBe(true);
        const updated = invoiceRepository.updatedInvoice;
        expect(updated?.numeroFactura).toBe('MAN-1');
        expect(updated?.headerSource).toBe(InvoiceHeaderSource.Manual);
        expect(updated?.headerStatus).toBe(InvoiceHeaderStatus.Confirmed);
    });
});
