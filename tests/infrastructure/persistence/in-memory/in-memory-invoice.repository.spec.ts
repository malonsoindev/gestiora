import { describe, expect, it } from 'vitest';
import { InMemoryInvoiceRepository } from '@infrastructure/persistence/in-memory/in-memory-invoice.repository.js';
import { InvoiceStatus } from '@domain/entities/invoice.entity.js';
import { invoiceRepositoryContract } from '@tests/infrastructure/persistence/contracts/invoice-repository.contract.js';
import { createTestInvoice, FIXED_NOW } from '@tests/shared/builders/invoice.builder.js';

const TEST_PREFIX = 'mem-inv-test';

describe('InMemoryInvoiceRepository', () => {
    // Shared repository for contract tests
    let repository: InMemoryInvoiceRepository;

    // Reset repository before each test via a fresh instance
    const getRepository = () => {
        repository = new InMemoryInvoiceRepository();
        return repository;
    };

    // Run contract tests
    invoiceRepositoryContract({
        getRepository,
        testPrefix: TEST_PREFIX,
    });

    // Implementation-specific tests
    describe('InMemory-specific behavior', () => {
        it('excludes deleted invoices from list by default (no status filter)', async () => {
            const repo = new InMemoryInvoiceRepository();
            const activeInvoice = createTestInvoice({
                id: 'invoice-active',
                status: InvoiceStatus.Active,
            });
            const deletedInvoice = createTestInvoice({
                id: 'invoice-deleted',
                status: InvoiceStatus.Deleted,
                deletedAt: FIXED_NOW,
            });

            await repo.create(activeInvoice);
            await repo.create(deletedInvoice);

            const result = await repo.list({ page: 1, pageSize: 100 });

            expect(result.success).toBe(true);
            if (result.success) {
                const ids = result.value.items.map((i) => i.id);
                expect(ids).toContain('invoice-active');
                expect(ids).not.toContain('invoice-deleted');
            }
        });
    });
});
