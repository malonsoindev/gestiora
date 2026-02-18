import postgres from 'postgres';
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgresInvoiceRepository } from '@infrastructure/persistence/postgres/postgres-invoice.repository.js';
import { Invoice, InvoiceHeaderStatus, InvoiceStatus } from '@domain/entities/invoice.entity.js';
import type { InvoiceProps } from '@domain/entities/invoice.entity.js';
import { InvoiceMovement, InvoiceMovementStatus } from '@domain/entities/invoice-movement.entity.js';
import type { InvoiceMovementProps } from '@domain/entities/invoice-movement.entity.js';
import { DataSource } from '@domain/enums/data-source.enum.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';
import { FileRef } from '@domain/value-objects/file-ref.value-object.js';
import { createTestInvoice } from '@tests/shared/fixtures/invoice.fixture.js';

const describeIf = process.env.DATABASE_URL ? describe : describe.skip;
const fixedNow = new Date('2026-03-10T10:00:00.000Z');

const createMovement = (overrides: Partial<InvoiceMovementProps> = {}): InvoiceMovement =>
    InvoiceMovement.create({
        id: 'movement-1',
        concepto: 'Servicio',
        cantidad: 1,
        precio: 100,
        baseImponible: 100,
        iva: 21,
        total: 121,
        source: DataSource.Ai,
        status: InvoiceMovementStatus.Proposed,
        ...overrides,
    });

type CreateInvoiceOptions = {
    overrides?: Partial<InvoiceProps>;
    withFileRef?: boolean;
};

const createInvoice = (options: CreateInvoiceOptions | Partial<InvoiceProps> = {}): Invoice => {
    // Support both old signature (overrides only) and new signature (options object)
    const isOptionsObject = 'overrides' in options || 'withFileRef' in options;
    const overrides = isOptionsObject ? (options as CreateInvoiceOptions).overrides ?? {} : (options as Partial<InvoiceProps>);
    const withFileRef = isOptionsObject ? (options as CreateInvoiceOptions).withFileRef ?? true : true;

    const baseProps: Partial<InvoiceProps> = {
        status: InvoiceStatus.Active,
        headerSource: DataSource.Ai,
        headerStatus: InvoiceHeaderStatus.Proposed,
        numeroFactura: 'FAC-2026-0010',
        fechaOperacion: InvoiceDate.create('2026-03-01'),
        fechaVencimiento: InvoiceDate.create('2026-03-31'),
        baseImponible: Money.create(100),
        iva: Money.create(21),
        total: Money.create(121),
        movements: [createMovement()],
        ...overrides,
    };

    if (withFileRef && !('fileRef' in overrides)) {
        baseProps.fileRef = FileRef.create({
            storageKey: 'storage/invoice-1.pdf',
            filename: 'invoice-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 10,
            checksum: 'checksum-1',
        });
    }

    return createTestInvoice({
        now: fixedNow,
        overrides: baseProps,
    });
};

describeIf('PostgresInvoiceRepository', () => {
    const sql = postgres(process.env.DATABASE_URL as string, { max: 1 });
    const repository = new PostgresInvoiceRepository(sql);

    beforeAll(async () => {
        await sql`
            create table if not exists providers (
                id text primary key,
                razon_social text not null,
                razon_social_normalized text not null,
                cif text null,
                direccion text null,
                poblacion text null,
                provincia text null,
                pais text null,
                status text not null,
                created_at timestamptz not null,
                updated_at timestamptz not null,
                deleted_at timestamptz null
            )
        `;

        await sql`
            create table if not exists invoices (
                id text primary key,
                provider_id text not null references providers(id),
                status text not null,
                header_source text not null,
                header_status text not null,
                numero_factura text null,
                fecha_operacion date null,
                fecha_vencimiento date null,
                base_imponible numeric null,
                iva numeric null,
                total numeric null,
                file_storage_key text null,
                file_filename text null,
                file_mime_type text null,
                file_size_bytes integer null,
                file_checksum text null,
                created_at timestamptz not null,
                updated_at timestamptz not null,
                deleted_at timestamptz null
            )
        `;

        await sql`
            create table if not exists invoice_movements (
                id text primary key,
                invoice_id text not null references invoices(id),
                concepto text not null,
                cantidad numeric not null,
                precio numeric not null,
                base_imponible numeric null,
                iva numeric null,
                total numeric not null,
                source text not null,
                status text not null
            )
        `;
    });

    beforeEach(async () => {
        await sql`delete from invoice_movements`;
        await sql`delete from invoices`;
        await sql`delete from providers`;
        await sql`
            insert into providers (
                id,
                razon_social,
                razon_social_normalized,
                status,
                created_at,
                updated_at
            ) values (
                'provider-1',
                'Proveedor Demo',
                'proveedor demo',
                'ACTIVE',
                ${fixedNow},
                ${fixedNow}
            )
        `;
    });

    afterAll(async () => {
        await sql.end({ timeout: 5 });
    });

    it('creates and fetches invoice with movements', async () => {
        const invoice = createInvoice();

        const createResult = await repository.create(invoice);
        const findResult = await repository.findById(invoice.id);

        expect(createResult.success).toBe(true);
        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value?.id).toBe('invoice-1');
            expect(findResult.value?.movements).toHaveLength(1);
            expect(findResult.value?.headerSource).toBe(DataSource.Ai);
        }
    });

    it('updates invoice and replaces movements', async () => {
        const invoice = createInvoice();
        await repository.create(invoice);

        const updated = createInvoice({
            id: 'invoice-1',
            movements: [createMovement({ id: 'movement-2', concepto: 'Nuevo' })],
            updatedAt: new Date('2026-03-11T10:00:00.000Z'),
        });

        const updateResult = await repository.update(updated);
        const findResult = await repository.findById('invoice-1');

        expect(updateResult.success).toBe(true);
        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.movements).toHaveLength(1);
            const firstMovement = findResult.value.movements[0];
            expect(firstMovement).toBeDefined();
            expect(firstMovement!.id).toBe('movement-2');
        }
    });

    it('lists invoices with filters', async () => {
        const invoice = createInvoice();
        await repository.create(invoice);

        const listResult = await repository.list({
            page: 1,
            pageSize: 10,
            status: InvoiceStatus.Active,
            providerId: 'provider-1',
        });

        expect(listResult.success).toBe(true);
        if (listResult.success) {
            expect(listResult.value.items).toHaveLength(1);
            const firstItem = listResult.value.items[0];
            expect(firstItem).toBeDefined();
            expect(firstItem!.id).toBe('invoice-1');
        }
    });

    it('findById returns null for non-existent invoice', async () => {
        const result = await repository.findById('non-existent-id');

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value).toBeNull();
        }
    });

    it('creates invoice without fileRef', async () => {
        const invoice = createInvoice({ withFileRef: false });

        const createResult = await repository.create(invoice);
        const findResult = await repository.findById(invoice.id);

        expect(createResult.success).toBe(true);
        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.id).toBe('invoice-1');
            expect(findResult.value.fileRef).toBeUndefined();
        }
    });

    it('creates invoice without movements', async () => {
        const invoice = createInvoice({
            movements: [],
        });

        const createResult = await repository.create(invoice);
        const findResult = await repository.findById(invoice.id);

        expect(createResult.success).toBe(true);
        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.id).toBe('invoice-1');
            expect(findResult.value.movements).toHaveLength(0);
        }
    });

    it('creates invoice with multiple movements', async () => {
        const invoice = createInvoice({
            movements: [
                createMovement({ id: 'movement-1', concepto: 'Servicio A', total: 100 }),
                createMovement({ id: 'movement-2', concepto: 'Servicio B', total: 200 }),
                createMovement({ id: 'movement-3', concepto: 'Servicio C', total: 300 }),
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

    it('lists invoices with pagination (page 2)', async () => {
        // Create 3 invoices
        const invoice1 = createInvoice({ id: 'invoice-1' });
        const invoice2 = createInvoice({ id: 'invoice-2' });
        await repository.create(invoice1);
        await repository.create(invoice2);

        // Request page 2 with pageSize 1
        const listResult = await repository.list({
            page: 2,
            pageSize: 1,
        });

        expect(listResult.success).toBe(true);
        if (listResult.success) {
            expect(listResult.value.items).toHaveLength(1);
            expect(listResult.value.total).toBe(2);
        }
    });

    it('list excludes soft-deleted invoices by default', async () => {
        const activeInvoice = createInvoice({ id: 'invoice-1' });
        const deletedInvoice = createInvoice({
            id: 'invoice-2',
            status: InvoiceStatus.Deleted,
            deletedAt: fixedNow,
        });

        await repository.create(activeInvoice);
        await repository.create(deletedInvoice);

        const listResult = await repository.list({
            page: 1,
            pageSize: 10,
            status: InvoiceStatus.Active,
        });

        expect(listResult.success).toBe(true);
        if (listResult.success) {
            expect(listResult.value.items).toHaveLength(1);
            expect(listResult.value.items[0]!.id).toBe('invoice-1');
        }
    });

    it('list with status=DELETED includes soft-deleted invoices', async () => {
        const deletedInvoice = createInvoice({
            id: 'invoice-1',
            status: InvoiceStatus.Deleted,
            deletedAt: fixedNow,
        });

        await repository.create(deletedInvoice);

        const listResult = await repository.list({
            page: 1,
            pageSize: 10,
            status: InvoiceStatus.Deleted,
        });

        expect(listResult.success).toBe(true);
        if (listResult.success) {
            expect(listResult.value.items).toHaveLength(1);
            expect(listResult.value.items[0]!.id).toBe('invoice-1');
            expect(listResult.value.items[0]!.status).toBe(InvoiceStatus.Deleted);
        }
    });

    it('list without filters returns all non-deleted invoices', async () => {
        const invoice1 = createInvoice({ id: 'invoice-1', status: InvoiceStatus.Active });
        const invoice2 = createInvoice({ id: 'invoice-2', status: InvoiceStatus.Draft });

        await repository.create(invoice1);
        await repository.create(invoice2);

        const listResult = await repository.list({
            page: 1,
            pageSize: 10,
        });

        expect(listResult.success).toBe(true);
        if (listResult.success) {
            expect(listResult.value.items).toHaveLength(2);
            expect(listResult.value.total).toBe(2);
        }
    });

    it('getDetail returns same result as findById', async () => {
        const invoice = createInvoice();
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
        const invoice = createInvoice();
        await repository.create(invoice);

        const deletedAt = new Date('2026-03-15T10:00:00.000Z');
        const updatedInvoice = createInvoice({
            id: 'invoice-1',
            status: InvoiceStatus.Deleted,
            deletedAt,
            updatedAt: deletedAt,
        });

        const updateResult = await repository.update(updatedInvoice);
        const findResult = await repository.findById('invoice-1');

        expect(updateResult.success).toBe(true);
        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.status).toBe(InvoiceStatus.Deleted);
            expect(findResult.value.deletedAt).toEqual(deletedAt);
        }
    });
});
