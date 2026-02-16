import { describe, expect, it } from 'vitest';
import { GetInvoiceDetailUseCase } from '@application/use-cases/get-invoice-detail.use-case.js';
import { Invoice, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import type { InvoiceProps } from '@domain/entities/invoice.entity.js';
import { InvoiceNotFoundError } from '@domain/errors/invoice-not-found.error.js';
import { InvoiceRepositoryStub } from '@tests/shared/stubs/invoice-repository.stub.js';
import { createTestInvoice } from '@tests/shared/fixtures/invoice.fixture.js';

const fixedNow = new Date('2026-02-21T10:00:00.000Z');

const createInvoice = (overrides: Partial<InvoiceProps> = {}): Invoice =>
    createTestInvoice({
        now: fixedNow,
        overrides: {
            status: InvoiceStatus.Active,
            ...overrides,
        },
    });

describe('GetInvoiceDetailUseCase', () => {
    it('returns invoice detail', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(createInvoice());
        const useCase = new GetInvoiceDetailUseCase({ invoiceRepository });

        const result = await useCase.execute({ invoiceId: 'invoice-1' });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.invoiceId).toBe('invoice-1');
            expect(result.value.providerId).toBe('provider-1');
        }
    });

    it('returns not found when invoice does not exist', async () => {
        const invoiceRepository = new InvoiceRepositoryStub(null);
        const useCase = new GetInvoiceDetailUseCase({ invoiceRepository });

        const result = await useCase.execute({ invoiceId: 'missing' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvoiceNotFoundError);
        }
    });
});
