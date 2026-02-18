import { describe, expect, it } from 'vitest';
import { ListInvoicesUseCase } from '@application/use-cases/list-invoices.use-case.js';
import { Invoice } from '@domain/entities/invoice.entity.js';
import type { InvoiceProps } from '@domain/entities/invoice.entity.js';
import { InvoiceRepositoryStub } from '@tests/shared/stubs/invoice-repository.stub.js';
import { createTestInvoice } from '@tests/shared/fixtures/invoice.fixture.js';

const fixedNow = new Date('2026-02-20T10:00:00.000Z');

const createInvoice = (overrides: Partial<InvoiceProps> = {}): Invoice =>
    createTestInvoice({
        now: fixedNow,
        overrides,
    });

describe('ListInvoicesUseCase', () => {
    it('returns a paginated list of invoices', async () => {
        const invoice = createInvoice();
        const invoiceRepository = new InvoiceRepositoryStub(null, {
            items: [invoice],
            total: 1,
        });

        const useCase = new ListInvoicesUseCase({ invoiceRepository });

        const result = await useCase.execute({ page: 1, pageSize: 20 });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.items).toHaveLength(1);
            expect(result.value.total).toBe(1);
        }
    });
});
