import { describe, expect, it } from 'vitest';
import { RagReindexInvoiceService } from '@application/services/rag-reindex-invoice.service.js';
import type { SearchQueryRepository, SearchQueryRecord } from '@application/ports/search-query.repository.js';
import { PortError } from '@application/errors/port.error.js';
import { Invoice, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { InvoiceMovement } from '@domain/entities/invoice-movement.entity.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { ok, fail, type Result } from '@shared/result.js';
import { InvoiceRepositoryStub } from '@tests/shared/stubs/invoice-repository.stub.js';
import { ProviderRepositoryStub } from '@tests/shared/stubs/provider-repository.stub.js';
import { fixedNow } from '@tests/shared/fixed-now.js';

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

class SearchQueryRepositoryStub implements SearchQueryRepository {
    cleared = false;

    async findByKey(): Promise<Result<SearchQueryRecord | null, PortError>> {
        return ok(null);
    }

    async findById(): Promise<Result<SearchQueryRecord | null, PortError>> {
        return ok(null);
    }

    async save(): Promise<Result<void, PortError>> {
        return ok(undefined);
    }

    async clearAll(): Promise<Result<void, PortError>> {
        this.cleared = true;
        return ok(undefined);
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

type SutOverrides = Partial<{
    invoice: Invoice | null;
    provider: Provider | null;
    shouldFail: boolean;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const invoice = overrides.invoice === undefined ? createInvoice() : overrides.invoice;
    const provider = overrides.provider === undefined ? createProvider() : overrides.provider;
    const indexUseCase = new IndexInvoicesForRagUseCaseStub(overrides.shouldFail ?? false);
    const service = new RagReindexInvoiceService({
        invoiceRepository: new InvoiceRepositoryStub(invoice),
        providerRepository: new ProviderRepositoryStub(provider),
        searchQueryRepository: new SearchQueryRepositoryStub(),
        indexInvoicesForRagUseCase: indexUseCase,
    });

    return { service, indexUseCase, invoice };
};

describe('RagReindexInvoiceService', () => {
    it('reindexes invoice with provider', async () => {
        const { service, invoice } = makeSut();
        const invoiceId = invoice?.id ?? 'invoice-1';

        const result = await service.reindex(invoiceId);

        expect(result.success).toBe(true);
    });

    it('returns error when invoice is missing', async () => {
        const { service } = makeSut({ invoice: null, provider: null });

        const result = await service.reindex('invoice-1');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvoiceNotFoundError);
        }
    });

    it('returns error when indexing fails', async () => {
        const { service, invoice } = makeSut({ shouldFail: true });
        const invoiceId = invoice?.id ?? 'invoice-1';

        const result = await service.reindex(invoiceId);

        expect(result.success).toBe(false);
    });
});
