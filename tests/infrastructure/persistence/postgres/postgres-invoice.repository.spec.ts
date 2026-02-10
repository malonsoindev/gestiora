import postgres from 'postgres';
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgresInvoiceRepository } from '../../../../src/infrastructure/persistence/postgres/postgres-invoice.repository.js';
import { Invoice, InvoiceHeaderSource, InvoiceHeaderStatus, InvoiceStatus } from '../../../../src/domain/entities/invoice.entity.js';
import type { InvoiceProps } from '../../../../src/domain/entities/invoice.entity.js';
import { InvoiceMovement, InvoiceMovementSource, InvoiceMovementStatus } from '../../../../src/domain/entities/invoice-movement.entity.js';
import type { InvoiceMovementProps } from '../../../../src/domain/entities/invoice-movement.entity.js';
import { InvoiceDate } from '../../../../src/domain/value-objects/invoice-date.value-object.js';
import { Money } from '../../../../src/domain/value-objects/money.value-object.js';
import { FileRef } from '../../../../src/domain/value-objects/file-ref.value-object.js';

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
        source: InvoiceMovementSource.Ai,
        status: InvoiceMovementStatus.Proposed,
        ...overrides,
    });

const createInvoice = (overrides: Partial<InvoiceProps> = {}): Invoice =>
    Invoice.create({
        id: 'invoice-1',
        providerId: 'provider-1',
        status: InvoiceStatus.Active,
        headerSource: InvoiceHeaderSource.Ai,
        headerStatus: InvoiceHeaderStatus.Proposed,
        numeroFactura: 'FAC-2026-0010',
        fechaOperacion: InvoiceDate.create('2026-03-01'),
        fechaVencimiento: InvoiceDate.create('2026-03-31'),
        baseImponible: Money.create(100),
        iva: Money.create(21),
        total: Money.create(121),
        fileRef: FileRef.create({
            storageKey: 'storage/invoice-1.pdf',
            filename: 'invoice-1.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 10,
            checksum: 'checksum-1',
        }),
        movements: [createMovement()],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        ...overrides,
    });

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
        await sql`delete from invoice_movements where invoice_id in ('invoice-1', 'invoice-2')`;
        await sql`delete from invoices where id in ('invoice-1', 'invoice-2')`;
        await sql`delete from providers where id in ('provider-1', 'provider-2')`;
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
            expect(findResult.value?.headerSource).toBe(InvoiceHeaderSource.Ai);
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
        if (findResult.success) {
            expect(findResult.value?.movements).toHaveLength(1);
            expect(findResult.value?.movements[0].id).toBe('movement-2');
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
            expect(listResult.value.items[0].id).toBe('invoice-1');
        }
    });
});
