import { describe, expect, it } from 'vitest';
import { RagReindexProviderInvoicesService } from '@application/services/rag-reindex-provider-invoices.service.js';
import type { InvoiceRepository, InvoiceListResult } from '@application/ports/invoice.repository.js';
import type { SearchQueryRepository, SearchQueryRecord } from '@application/ports/search-query.repository.js';
import { PortError } from '@application/errors/port.error.js';
import { Invoice, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { InvoiceMovement } from '@domain/entities/invoice-movement.entity.js';
import { ProviderNotFoundError } from '@domain/errors/provider-not-found.error.js';
import { ok, fail, type Result } from '@shared/result.js';
import { ProviderRepositoryStub } from '../../shared/stubs/provider-repository.stub.js';
import { fixedNow } from '../../shared/fixed-now.js';

class InvoiceRepositoryStub implements InvoiceRepository {
    private readonly pages: InvoiceListResult[];
    private readonly invoicesById = new Map<string, Invoice>();

    constructor(pages: InvoiceListResult[], details: Invoice[]) {
        this.pages = pages;
        details.forEach((invoice) => this.invoicesById.set(invoice.id, invoice));
    }

    async create() {
        return ok(undefined);
    }

    async findById() {
        return ok(null);
    }

    async update() {
        return ok(undefined);
    }

    async list({ page }: { page: number }): Promise<Result<InvoiceListResult, PortError>> {
        const index = Math.max(page - 1, 0);
        return ok(this.pages[index] ?? { items: [], total: 0 });
    }

    async getDetail(invoiceId: string): Promise<Result<Invoice | null, PortError>> {
        return ok(this.invoicesById.get(invoiceId) ?? null);
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

class IndexInvoicesForRagUseCaseStub {
    calledRows: Array<{ invoice: Invoice; provider: Provider | null }> = [];
    private readonly shouldFail: boolean;

    constructor(shouldFail = false) {
        this.shouldFail = shouldFail;
    }

    async execute(request: { rows: Array<{ invoice: Invoice; provider: Provider | null }> })
        : Promise<Result<{ documentsIndexed: number }, PortError>> {
        if (this.shouldFail) {
            return fail(new PortError('RagIndexer', 'Index failed'));
        }
        this.calledRows.push(...request.rows);
        return ok({ documentsIndexed: request.rows.length });
    }
}

const createInvoice = (id: string): Invoice =>
    Invoice.create({
        id,
        providerId: 'provider-1',
        status: InvoiceStatus.Active,
        numeroFactura: `FAC-${id}`,
        fechaOperacion: InvoiceDate.create('2026-02-10'),
        baseImponible: Money.create(100),
        iva: Money.create(21),
        total: Money.create(121),
        movements: [
            InvoiceMovement.create({
                id: `movement-${id}`,
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
    provider: Provider | null;
    pages: InvoiceListResult[];
    details: Invoice[];
    shouldFail: boolean;
    pageSize: number;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const provider = overrides.provider === undefined ? createProvider() : overrides.provider;
    const pages = overrides.pages ?? [];
    const details = overrides.details ?? [];
    const indexUseCase = new IndexInvoicesForRagUseCaseStub(overrides.shouldFail ?? false);
    const service = new RagReindexProviderInvoicesService({
        invoiceRepository: new InvoiceRepositoryStub(pages, details),
        providerRepository: new ProviderRepositoryStub(provider),
        searchQueryRepository: new SearchQueryRepositoryStub(),
        indexInvoicesForRagUseCase: indexUseCase,
        pageSize: overrides.pageSize ?? 10,
    });

    return { service, indexUseCase };
};

describe('RagReindexProviderInvoicesService', () => {
    it('reindexes invoices in pages', async () => {
        const invoices = [createInvoice('1'), createInvoice('2')];
        const { service, indexUseCase } = makeSut({
            pages: [
                { items: invoices.slice(0, 1), total: 2 },
                { items: invoices.slice(1, 2), total: 2 },
            ],
            details: invoices,
            pageSize: 1,
        });

        const result = await service.reindexByProviderId('provider-1');

        expect(result.success).toBe(true);
        expect(indexUseCase.calledRows).toHaveLength(2);
    });

    it('returns error when provider is missing', async () => {
        const { service } = makeSut({ provider: null, pages: [], details: [] });

        const result = await service.reindexByProviderId('provider-1');

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ProviderNotFoundError);
        }
    });

    it('returns error when indexing fails', async () => {
        const invoices = [createInvoice('1')];
        const { service } = makeSut({
            pages: [{ items: invoices, total: 1 }],
            details: invoices,
            shouldFail: true,
        });

        const result = await service.reindexByProviderId('provider-1');

        expect(result.success).toBe(false);
    });
});
