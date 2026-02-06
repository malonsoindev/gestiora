import { describe, expect, it } from 'vitest';
import { GetInvoiceFileUseCase } from '../../../src/application/use-cases/get-invoice-file.use-case.js';
import type { InvoiceRepository } from '../../../src/application/ports/invoice.repository.js';
import type { FileStorage } from '../../../src/application/ports/file-storage.js';
import { Invoice, InvoiceStatus } from '../../../src/domain/entities/invoice.entity.js';
import type { InvoiceProps } from '../../../src/domain/entities/invoice.entity.js';
import { InvoiceMovement } from '../../../src/domain/entities/invoice-movement.entity.js';
import { InvoiceDate } from '../../../src/domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../../src/domain/value-objects/money.value-object.js';
import { FileRef } from '../../../src/domain/value-objects/file-ref.value-object.js';
import { InvoiceNotFoundError } from '../../../src/domain/errors/invoice-not-found.error.js';
import { InvalidInvoiceStatusError } from '../../../src/domain/errors/invalid-invoice-status.error.js';
import { ok } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-23T10:00:00.000Z');

class InvoiceRepositoryStub implements InvoiceRepository {
    constructor(private readonly invoice: Invoice | null) {}

    async create() {
        return ok(undefined);
    }

    async findById() {
        return ok(this.invoice);
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

    async get(storageKey: string) {
        return ok({
            storageKey,
            filename: 'invoice-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1234,
            content: Buffer.from('pdf-content'),
        });
    }
}

const createInvoice = (overrides: Partial<InvoiceProps> = {}): Invoice =>
    Invoice.create({
        id: 'invoice-1',
        providerId: 'provider-1',
        status: InvoiceStatus.Active,
        numeroFactura: 'FAC-2026-0001',
        fechaOperacion: InvoiceDate.create('2026-02-10'),
        fechaVencimiento: InvoiceDate.create('2026-03-10'),
        baseImponible: Money.create(100),
        iva: Money.create(21),
        total: Money.create(121),
        fileRef: FileRef.create({
            storageKey: 'invoices/2026/02/invoice-1.pdf',
            filename: 'invoice-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1234,
            checksum: 'checksum-1',
        }),
        movements: [
            InvoiceMovement.create({
                id: 'movement-1',
                concepto: 'Servicio',
                cantidad: 1,
                precio: 100,
                baseImponible: 100,
                iva: 21,
                total: 121,
            }),
        ],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        ...overrides,
    });

describe('GetInvoiceFileUseCase', () => {
    it('returns file content when invoice has fileRef', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(createInvoice());
        const fileStorage = new FileStorageStub();
        const useCase = new GetInvoiceFileUseCase({ invoiceRepository, fileStorage });

        const result = await useCase.execute({ invoiceId: 'invoice-1' });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.filename).toBe('invoice-1.pdf');
            expect(result.value.mimeType).toBe('application/pdf');
        }
    });

    it('returns not found when invoice does not exist', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(null);
        const fileStorage = new FileStorageStub();
        const useCase = new GetInvoiceFileUseCase({ invoiceRepository, fileStorage });

        const result = await useCase.execute({ invoiceId: 'missing' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvoiceNotFoundError);
        }
    });

    it('rejects when invoice is deleted', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(
            createInvoice({
                status: InvoiceStatus.Deleted,
                deletedAt: new Date('2026-02-12T10:00:00.000Z'),
            }),
        );
        const fileStorage = new FileStorageStub();
        const useCase = new GetInvoiceFileUseCase({ invoiceRepository, fileStorage });

        const result = await useCase.execute({ invoiceId: 'invoice-1' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidInvoiceStatusError);
        }
    });
});
