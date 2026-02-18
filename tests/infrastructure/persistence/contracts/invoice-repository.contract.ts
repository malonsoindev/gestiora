import { describe, expect, it } from 'vitest';
import type { InvoiceRepository } from '@application/ports/invoice.repository.js';
import { InvoiceStatus } from '@domain/entities/invoice.entity.js';
import { DataSource } from '@domain/enums/data-source.enum.js';
import {
    createTestInvoice,
    createTestMovement,
    createTestInvoiceIds,
    FIXED_NOW,
} from '@tests/shared/builders/invoice.builder.js';

/**
 * Context required to run the InvoiceRepository contract tests.
 */
export interface InvoiceRepositoryContractContext {
    /** Returns the repository instance to test */
    getRepository: () => InvoiceRepository;
    /** Unique prefix to avoid conflicts between test runs */
    testPrefix: string;
}

/**
 * Contract tests for InvoiceRepository implementations.
 * These tests verify that any implementation correctly fulfills the InvoiceRepository interface.
 *
 * Usage:
 * ```ts
 * invoiceRepositoryContract({
 *   getRepository: () => repository,
 *   testPrefix: 'postgres-invoice-test',
 * });
 * ```
 */
export function invoiceRepositoryContract(ctx: InvoiceRepositoryContractContext): void {
    const INVOICE_IDS = createTestInvoiceIds(ctx.testPrefix);

    describe('InvoiceRepository Contract', () => {
        it('creates and retrieves an invoice by id', async () => {
            const repository = ctx.getRepository();
            const invoice = createTestInvoice({ id: INVOICE_IDS.one });

            const createResult = await repository.create(invoice);
            expect(createResult.success).toBe(true);

            const findResult = await repository.findById(invoice.id);

            expect(findResult.success).toBe(true);
            if (findResult.success) {
                expect(findResult.value?.id).toBe(INVOICE_IDS.one);
                expect(findResult.value?.movements).toHaveLength(1);
                expect(findResult.value?.headerSource).toBe(DataSource.Ai);
            }
        });

        it('returns null when invoice not found by id', async () => {
            const repository = ctx.getRepository();
            const findResult = await repository.findById('non-existent-id');

            expect(findResult.success).toBe(true);
            if (findResult.success) {
                expect(findResult.value).toBeNull();
            }
        });

        it('updates an invoice and replaces movements', async () => {
            const repository = ctx.getRepository();
            const invoice = createTestInvoice({ id: INVOICE_IDS.one });
            await repository.create(invoice);

            const updatedAt = new Date('2026-03-11T10:00:00.000Z');
            const updated = createTestInvoice({
                id: INVOICE_IDS.one,
                movements: [createTestMovement({ id: `${INVOICE_IDS.one}-movement-2`, concepto: 'Nuevo' })],
                updatedAt,
            });

            const updateResult = await repository.update(updated);
            const findResult = await repository.findById(INVOICE_IDS.one);

            expect(updateResult.success).toBe(true);
            expect(findResult.success).toBe(true);
            if (findResult.success && findResult.value) {
                expect(findResult.value.movements).toHaveLength(1);
                const firstMovement = findResult.value.movements[0];
                expect(firstMovement).toBeDefined();
                expect(firstMovement!.id).toBe(`${INVOICE_IDS.one}-movement-2`);
            }
        });

        it('lists invoices with filters', async () => {
            const repository = ctx.getRepository();
            const invoice = createTestInvoice({
                id: INVOICE_IDS.one,
                status: InvoiceStatus.Active,
            });
            await repository.create(invoice);

            const listResult = await repository.list({
                page: 1,
                pageSize: 10,
                status: InvoiceStatus.Active,
                providerId: 'provider-1',
            });

            expect(listResult.success).toBe(true);
            if (listResult.success) {
                const ourInvoice = listResult.value.items.find((i) => i.id === INVOICE_IDS.one);
                expect(ourInvoice).toBeDefined();
            }
        });

        it('creates invoice without fileRef', async () => {
            const repository = ctx.getRepository();
            const invoice = createTestInvoice({
                id: INVOICE_IDS.one,
                withFileRef: false,
            });

            const createResult = await repository.create(invoice);
            const findResult = await repository.findById(invoice.id);

            expect(createResult.success).toBe(true);
            expect(findResult.success).toBe(true);
            if (findResult.success && findResult.value) {
                expect(findResult.value.id).toBe(INVOICE_IDS.one);
                expect(findResult.value.fileRef).toBeUndefined();
            }
        });

        it('creates invoice without movements', async () => {
            const repository = ctx.getRepository();
            const invoice = createTestInvoice({
                id: INVOICE_IDS.one,
                movements: [],
            });

            const createResult = await repository.create(invoice);
            const findResult = await repository.findById(invoice.id);

            expect(createResult.success).toBe(true);
            expect(findResult.success).toBe(true);
            if (findResult.success && findResult.value) {
                expect(findResult.value.id).toBe(INVOICE_IDS.one);
                expect(findResult.value.movements).toHaveLength(0);
            }
        });

        it('creates invoice with multiple movements', async () => {
            const repository = ctx.getRepository();
            const invoice = createTestInvoice({
                id: INVOICE_IDS.one,
                movements: [
                    createTestMovement({ id: `${INVOICE_IDS.one}-m1`, concepto: 'Servicio A', total: 100 }),
                    createTestMovement({ id: `${INVOICE_IDS.one}-m2`, concepto: 'Servicio B', total: 200 }),
                    createTestMovement({ id: `${INVOICE_IDS.one}-m3`, concepto: 'Servicio C', total: 300 }),
                ],
            });

            const createResult = await repository.create(invoice);
            const findResult = await repository.findById(invoice.id);

            expect(createResult.success).toBe(true);
            expect(findResult.success).toBe(true);
            if (findResult.success && findResult.value) {
                expect(findResult.value.movements).toHaveLength(3);
                const concepts = findResult.value.movements.map((m) => m.concepto);
                expect(concepts).toContain('Servicio A');
                expect(concepts).toContain('Servicio B');
                expect(concepts).toContain('Servicio C');
            }
        });

        it('lists invoices with pagination', async () => {
            const repository = ctx.getRepository();
            const invoice1 = createTestInvoice({ id: INVOICE_IDS.one });
            const invoice2 = createTestInvoice({ id: INVOICE_IDS.two });
            await repository.create(invoice1);
            await repository.create(invoice2);

            const listResult = await repository.list({
                page: 2,
                pageSize: 1,
            });

            expect(listResult.success).toBe(true);
            if (listResult.success) {
                expect(listResult.value.items).toHaveLength(1);
                expect(listResult.value.total).toBeGreaterThanOrEqual(2);
            }
        });

        it('list excludes soft-deleted invoices by default', async () => {
            const repository = ctx.getRepository();
            const activeInvoice = createTestInvoice({
                id: INVOICE_IDS.one,
                status: InvoiceStatus.Active,
            });
            const deletedInvoice = createTestInvoice({
                id: INVOICE_IDS.two,
                status: InvoiceStatus.Deleted,
                deletedAt: FIXED_NOW,
            });

            await repository.create(activeInvoice);
            await repository.create(deletedInvoice);

            const listResult = await repository.list({
                page: 1,
                pageSize: 100,
                status: InvoiceStatus.Active,
            });

            expect(listResult.success).toBe(true);
            if (listResult.success) {
                const ids = listResult.value.items.map((i) => i.id);
                expect(ids).toContain(INVOICE_IDS.one);
                expect(ids).not.toContain(INVOICE_IDS.two);
            }
        });

        it('list with status=DELETED includes soft-deleted invoices', async () => {
            const repository = ctx.getRepository();
            const deletedInvoice = createTestInvoice({
                id: INVOICE_IDS.one,
                status: InvoiceStatus.Deleted,
                deletedAt: FIXED_NOW,
            });

            await repository.create(deletedInvoice);

            const listResult = await repository.list({
                page: 1,
                pageSize: 100,
                status: InvoiceStatus.Deleted,
            });

            expect(listResult.success).toBe(true);
            if (listResult.success) {
                const ourInvoice = listResult.value.items.find((i) => i.id === INVOICE_IDS.one);
                expect(ourInvoice).toBeDefined();
                expect(ourInvoice?.status).toBe(InvoiceStatus.Deleted);
            }
        });

        it('list without filters returns all non-deleted invoices', async () => {
            const repository = ctx.getRepository();
            const invoice1 = createTestInvoice({
                id: INVOICE_IDS.one,
                status: InvoiceStatus.Active,
            });
            const invoice2 = createTestInvoice({
                id: INVOICE_IDS.two,
                status: InvoiceStatus.Draft,
            });

            await repository.create(invoice1);
            await repository.create(invoice2);

            const listResult = await repository.list({
                page: 1,
                pageSize: 100,
            });

            expect(listResult.success).toBe(true);
            if (listResult.success) {
                const ids = listResult.value.items.map((i) => i.id);
                expect(ids).toContain(INVOICE_IDS.one);
                expect(ids).toContain(INVOICE_IDS.two);
            }
        });

        it('getDetail returns same result as findById', async () => {
            const repository = ctx.getRepository();
            const invoice = createTestInvoice({ id: INVOICE_IDS.one });
            await repository.create(invoice);

            const findResult = await repository.findById(invoice.id);
            const detailResult = await repository.getDetail(invoice.id);

            expect(findResult.success).toBe(true);
            expect(detailResult.success).toBe(true);
            if (findResult.success && detailResult.success) {
                expect(detailResult.value?.id).toBe(findResult.value?.id);
                expect(detailResult.value?.movements).toHaveLength(findResult.value?.movements.length ?? 0);
            }
        });

        it('update sets deletedAt for soft delete', async () => {
            const repository = ctx.getRepository();
            const invoice = createTestInvoice({ id: INVOICE_IDS.one });
            await repository.create(invoice);

            const deletedAt = new Date('2026-03-15T10:00:00.000Z');
            const updatedInvoice = createTestInvoice({
                id: INVOICE_IDS.one,
                status: InvoiceStatus.Deleted,
                deletedAt,
                updatedAt: deletedAt,
            });

            const updateResult = await repository.update(updatedInvoice);
            const findResult = await repository.findById(INVOICE_IDS.one);

            expect(updateResult.success).toBe(true);
            expect(findResult.success).toBe(true);
            if (findResult.success && findResult.value) {
                expect(findResult.value.status).toBe(InvoiceStatus.Deleted);
                expect(findResult.value.deletedAt).toEqual(deletedAt);
            }
        });
    });
}
