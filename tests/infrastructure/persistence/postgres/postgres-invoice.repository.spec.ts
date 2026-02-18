import { describe, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PostgresInvoiceRepository } from '@infrastructure/persistence/postgres/postgres-invoice.repository.js';
import { createPostgresTestContext } from '@tests/shared/helpers/postgres-test-context.js';
import { invoiceRepositoryContract } from '@tests/infrastructure/persistence/contracts/invoice-repository.contract.js';

const describeIf = process.env.DATABASE_URL ? describe : describe.skip;
const TEST_PREFIX = 'pg-inv-test';
const fixedNow = new Date('2026-03-10T10:00:00.000Z');

describeIf('PostgresInvoiceRepository', () => {
    const ctx = createPostgresTestContext();
    let repository: PostgresInvoiceRepository;

    beforeAll(async () => {
        await ctx.setup();

        // Create tables if they don't exist
        await ctx.sql`
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

        await ctx.sql`
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

        await ctx.sql`
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

        repository = new PostgresInvoiceRepository(ctx.sql);
    });

    beforeEach(async () => {
        await ctx.beginTransaction();

        // Clean existing data within the savepoint (will be rolled back after test)
        await ctx.sql`delete from invoice_movements`;
        await ctx.sql`delete from invoices`;
        await ctx.sql`delete from providers`;

        // Seed test provider within the transaction
        await ctx.sql`
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

    afterEach(async () => {
        await ctx.rollbackTransaction();
    });

    afterAll(async () => {
        await ctx.cleanup();
    });

    // Run contract tests
    invoiceRepositoryContract({
        getRepository: () => repository,
        testPrefix: TEST_PREFIX,
    });
});
