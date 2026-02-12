import { describe, expect, it } from 'vitest';
import { IndexInvoicesForRagUseCase } from '@application/use-cases/index-invoices-for-rag.use-case.js';
import type { RagDocument, RagIndexer } from '@application/ports/rag-indexer.js';
import { PortError } from '@application/errors/port.error.js';
import { Invoice, InvoiceHeaderSource, InvoiceHeaderStatus, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import { InvoiceMovement } from '@domain/entities/invoice-movement.entity.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { ok, fail, type Result } from '@shared/result.js';

const fixedNow = new Date('2026-02-11T10:00:00.000Z');

class RagIndexerSpy implements RagIndexer {
    documents: RagDocument[] = [];
    private readonly shouldFail: boolean;

    constructor(shouldFail = false) {
        this.shouldFail = shouldFail;
    }

    async index(documents: RagDocument[]): Promise<Result<void, PortError>> {
        if (this.shouldFail) {
            return fail(new PortError('RagIndexer', 'Index failed'));
        }
        this.documents = documents;
        return ok(undefined);
    }
}

const createMovements = (count: number): InvoiceMovement[] =>
    Array.from({ length: count }, (_, index) =>
        InvoiceMovement.create({
            id: `movement-${index + 1}`,
            concepto: `Linea ${index + 1}`,
            cantidad: 1,
            precio: 10,
            baseImponible: 10,
            iva: 2.1,
            total: 12.1,
        }),
    );

const createInvoice = (movementsCount: number): Invoice =>
    Invoice.create({
        id: 'invoice-1',
        providerId: 'provider-1',
        status: InvoiceStatus.Active,
        headerSource: InvoiceHeaderSource.Manual,
        headerStatus: InvoiceHeaderStatus.Confirmed,
        numeroFactura: 'FAC-001',
        fechaOperacion: InvoiceDate.create('2026-02-10'),
        fechaVencimiento: InvoiceDate.create('2026-03-10'),
        baseImponible: Money.create(100),
        iva: Money.create(21),
        total: Money.create(121),
        movements: createMovements(movementsCount),
        createdAt: fixedNow,
        updatedAt: fixedNow,
    });

const createProvider = (): Provider =>
    Provider.create({
        id: 'provider-1',
        razonSocial: 'Proveedor Demo SL',
        status: ProviderStatus.Active,
        createdAt: fixedNow,
        updatedAt: fixedNow,
    });

describe('IndexInvoicesForRagUseCase', () => {
    it('indexes base and movement chunks', async () => {
        const invoice = createInvoice(11);
        const provider = createProvider();
        const indexer = new RagIndexerSpy();
        const useCase = new IndexInvoicesForRagUseCase({
            ragIndexer: indexer,
            movementsChunkSize: 10,
        });

        const result = await useCase.execute({
            rows: [{ invoice, provider }],
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.documentsIndexed).toBe(3);
        }
        expect(indexer.documents).toHaveLength(3);
        expect(indexer.documents[0]?.metadata?.chunkType).toBe('base');
        expect(indexer.documents[1]?.metadata?.chunkType).toBe('movements');
        expect(indexer.documents[1]?.metadata?.chunkIndex).toBe('0');
        expect(indexer.documents[2]?.metadata?.chunkIndex).toBe('1');
    });

    it('returns an error when indexing fails', async () => {
        const invoice = createInvoice(0);
        const provider = createProvider();
        const indexer = new RagIndexerSpy(true);
        const useCase = new IndexInvoicesForRagUseCase({
            ragIndexer: indexer,
            movementsChunkSize: 10,
        });

        const result = await useCase.execute({
            rows: [{ invoice, provider }],
        });

        expect(result.success).toBe(false);
    });
});
