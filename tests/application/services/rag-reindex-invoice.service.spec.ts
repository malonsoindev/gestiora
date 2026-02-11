import { describe, expect, it } from 'vitest';
import { RagReindexInvoiceService } from '../../../src/application/services/rag-reindex-invoice.service.js';
import type { InvoiceRepository } from '../../../src/application/ports/invoice.repository.js';
import type { ProviderRepository } from '../../../src/application/ports/provider.repository.js';
import { PortError } from '../../../src/application/errors/port.error.js';
import { Invoice, InvoiceStatus } from '../../../src/domain/entities/invoice.entity.js';
import { Provider, ProviderStatus } from '../../../src/domain/entities/provider.entity.js';
import { InvoiceDate } from '../../../src/domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../../src/domain/value-objects/money.value-object.js';
import { InvoiceMovement } from '../../../src/domain/entities/invoice-movement.entity.js';
import { InvoiceNotFoundError } from '../../../src/domain/errors/invoice-not-found.error.js';
import { ok, fail, type Result } from '../../../src/shared/result.js';

const fixedNow = new Date('2026-02-15T10:00:00.000Z');

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
        return ok(this.invoice);
    }
}

class ProviderRepositoryStub implements ProviderRepository {
    constructor(private readonly provider: Provider | null) {}

    async create() {
        return ok(undefined);
    }

    async update() {
        return ok(undefined);
    }

    async findById() {
        return ok(this.provider);
    }

    async list() {
        return ok({ items: [], total: 0 });
    }

    async findByCif() {
        return ok(this.provider);
    }

    async findByRazonSocialNormalized() {
        return ok(this.provider);
    }
}

class IndexInvoicesForRagUseCaseStub {
    private readonly shouldFail: boolean;
    lastRows: Array<{ invoice: Invoice; provider: Provider | null }> = [];

    constructor(shouldFail = false) {
        this.shouldFail = shouldFail;
    }

    async execute(request: { rows: Array<{ invoice: Invoice; provider: Provider | null }> })
        : Promise<Result<{ documentsIndexed: number }, PortError>> {
        if (this.shouldFail) {
            return fail(new PortError('RagIndexer', 'Index failed'));
        }
        this.lastRows = request.rows;
        return ok({ documentsIndexed: request.rows.length });
    }
}

const createInvoice = (): Invoice =>
    Invoice.create({
        id: 'invoice-1',
        providerId: 'provider-1',
        status: InvoiceStatus.Active,
        numeroFactura: 'FAC-1',
        fechaOperacion: InvoiceDate.create('2026-02-10'),
        baseImponible: Money.create(100),
        iva: Money.create(21),
        total: Money.create(121),
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
    });

const createProvider = (): Provider =>
    Provider.create({
        id: 'provider-1',
        razonSocial: 'Proveedor Demo SL',
        status: ProviderStatus.Active,
        createdAt: fixedNow,
        updatedAt: fixedNow,
    });

describe('RagReindexInvoiceService', () => {
    it('reindexes invoice with provider', async () => {
        const invoice = createInvoice();
        const provider = createProvider();
        const service = new RagReindexInvoiceService({
            invoiceRepository: new InvoiceRepositoryStub(invoice),
            providerRepository: new ProviderRepositoryStub(provider),
            indexInvoicesForRagUseCase: new IndexInvoicesForRagUseCaseStub(),
        });

        const result = await service.reindex(invoice.id);

        expect(result.success).toBe(true);
    });

    it('returns error when invoice is missing', async () => {
        const service = new RagReindexInvoiceService({
            invoiceRepository: new InvoiceRepositoryStub(null),
            providerRepository: new ProviderRepositoryStub(null),
            indexInvoicesForRagUseCase: new IndexInvoicesForRagUseCaseStub(),
        });

        const result = await service.reindex('invoice-1');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvoiceNotFoundError);
        }
    });

    it('returns error when indexing fails', async () => {
        const invoice = createInvoice();
        const provider = createProvider();
        const service = new RagReindexInvoiceService({
            invoiceRepository: new InvoiceRepositoryStub(invoice),
            providerRepository: new ProviderRepositoryStub(provider),
            indexInvoicesForRagUseCase: new IndexInvoicesForRagUseCaseStub(true),
        });

        const result = await service.reindex(invoice.id);

        expect(result.success).toBe(false);
    });
});
