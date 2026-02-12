import type { Sql } from 'postgres';
import { fail, ok, type Result } from '@shared/result.js';
import { toDate } from '@shared/date-utils.js';
import { PortError } from '@application/errors/port.error.js';
import type { InvoiceListFilters, InvoiceListResult, InvoiceRepository } from '@application/ports/invoice.repository.js';
import {
    Invoice,
    InvoiceHeaderSource,
    InvoiceHeaderStatus,
    InvoiceStatus,
} from '@domain/entities/invoice.entity.js';
import { InvoiceMovement, InvoiceMovementSource, InvoiceMovementStatus } from '@domain/entities/invoice-movement.entity.js';
import { FileRef } from '@domain/value-objects/file-ref.value-object.js';
import { InvoiceDate } from '@domain/value-objects/invoice-date.value-object.js';
import { Money } from '@domain/value-objects/money.value-object.js';

type SqlClient = Sql<{}>;

type InvoiceRow = {
    id: string;
    provider_id: string;
    status: string;
    header_source: string;
    header_status: string;
    numero_factura: string | null;
    fecha_operacion: string | null;
    fecha_vencimiento: string | null;
    base_imponible: string | number | null;
    iva: string | number | null;
    total: string | number | null;
    file_storage_key: string | null;
    file_filename: string | null;
    file_mime_type: string | null;
    file_size_bytes: number | null;
    file_checksum: string | null;
    created_at: Date | string;
    updated_at: Date | string;
    deleted_at: Date | string | null;
};

type MovementRow = {
    id: string;
    invoice_id: string;
    concepto: string;
    cantidad: string | number;
    precio: string | number;
    base_imponible: string | number | null;
    iva: string | number | null;
    total: string | number;
    source: string;
    status: string;
};

export class PostgresInvoiceRepository implements InvoiceRepository {
    constructor(private readonly sql: SqlClient) {}

    async create(invoice: Invoice): Promise<Result<void, PortError>> {
        try {
            await this.sql`
                insert into invoices (
                    id,
                    provider_id,
                    status,
                    header_source,
                    header_status,
                    numero_factura,
                    fecha_operacion,
                    fecha_vencimiento,
                    base_imponible,
                    iva,
                    total,
                    file_storage_key,
                    file_filename,
                    file_mime_type,
                    file_size_bytes,
                    file_checksum,
                    created_at,
                    updated_at,
                    deleted_at
                ) values (
                    ${invoice.id},
                    ${invoice.providerId},
                    ${invoice.status},
                    ${invoice.headerSource},
                    ${invoice.headerStatus},
                    ${invoice.numeroFactura ?? null},
                    ${invoice.fechaOperacion ?? null},
                    ${invoice.fechaVencimiento ?? null},
                    ${invoice.baseImponible ?? null},
                    ${invoice.iva ?? null},
                    ${invoice.total ?? null},
                    ${invoice.fileRef?.storageKey ?? null},
                    ${invoice.fileRef?.filename ?? null},
                    ${invoice.fileRef?.mimeType ?? null},
                    ${invoice.fileRef?.sizeBytes ?? null},
                    ${invoice.fileRef?.checksum ?? null},
                    ${invoice.createdAt},
                    ${invoice.updatedAt},
                    ${invoice.deletedAt ?? null}
                )
            `;

            for (const movement of invoice.movements) {
                await this.sql`
                    insert into invoice_movements (
                        id,
                        invoice_id,
                        concepto,
                        cantidad,
                        precio,
                        base_imponible,
                        iva,
                        total,
                        source,
                        status
                    ) values (
                        ${movement.id},
                        ${invoice.id},
                        ${movement.concepto},
                        ${movement.cantidad},
                        ${movement.precio},
                        ${movement.baseImponible ?? null},
                        ${movement.iva ?? null},
                        ${movement.total},
                        ${movement.source},
                        ${movement.status}
                    )
                `;
            }

            return ok(undefined);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('InvoiceRepository', 'Failed to create invoice', cause));
        }
    }

    async findById(invoiceId: string): Promise<Result<Invoice | null, PortError>> {
        try {
            const rows = await this.sql<InvoiceRow[]>`
                select *
                from invoices
                where id = ${invoiceId}
                limit 1
            `;
            const row = rows[0];
            if (!row) {
                return ok(null);
            }

            const movements = await this.fetchMovements(invoiceId);
            return ok(this.mapRowToInvoice(row, movements));
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('InvoiceRepository', 'Failed to fetch invoice by id', cause));
        }
    }

    async update(invoice: Invoice): Promise<Result<void, PortError>> {
        try {
            await this.sql`
                update invoices
                set
                    provider_id = ${invoice.providerId},
                    status = ${invoice.status},
                    header_source = ${invoice.headerSource},
                    header_status = ${invoice.headerStatus},
                    numero_factura = ${invoice.numeroFactura ?? null},
                    fecha_operacion = ${invoice.fechaOperacion ?? null},
                    fecha_vencimiento = ${invoice.fechaVencimiento ?? null},
                    base_imponible = ${invoice.baseImponible ?? null},
                    iva = ${invoice.iva ?? null},
                    total = ${invoice.total ?? null},
                    file_storage_key = ${invoice.fileRef?.storageKey ?? null},
                    file_filename = ${invoice.fileRef?.filename ?? null},
                    file_mime_type = ${invoice.fileRef?.mimeType ?? null},
                    file_size_bytes = ${invoice.fileRef?.sizeBytes ?? null},
                    file_checksum = ${invoice.fileRef?.checksum ?? null},
                    updated_at = ${invoice.updatedAt},
                    deleted_at = ${invoice.deletedAt ?? null}
                where id = ${invoice.id}
            `;

            await this.sql`
                delete from invoice_movements
                where invoice_id = ${invoice.id}
            `;

            for (const movement of invoice.movements) {
                await this.sql`
                    insert into invoice_movements (
                        id,
                        invoice_id,
                        concepto,
                        cantidad,
                        precio,
                        base_imponible,
                        iva,
                        total,
                        source,
                        status
                    ) values (
                        ${movement.id},
                        ${invoice.id},
                        ${movement.concepto},
                        ${movement.cantidad},
                        ${movement.precio},
                        ${movement.baseImponible ?? null},
                        ${movement.iva ?? null},
                        ${movement.total},
                        ${movement.source},
                        ${movement.status}
                    )
                `;
            }

            return ok(undefined);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('InvoiceRepository', 'Failed to update invoice', cause));
        }
    }

    async list(filters: InvoiceListFilters): Promise<Result<InvoiceListResult, PortError>> {
        try {
            const offset = (filters.page - 1) * filters.pageSize;
            const rows = await this.sql<InvoiceRow[]>`
                select *
                from invoices
                where (${filters.status ?? null}::text is null or status = ${filters.status ?? null})
                  and (${filters.status ?? null}::text = ${InvoiceStatus.Deleted} or deleted_at is null)
                  and (${filters.providerId ?? null}::text is null or provider_id = ${filters.providerId ?? null})
                order by created_at desc
                limit ${filters.pageSize}
                offset ${offset}
            `;

            const totalResult = await this.sql`
                select count(*)::int as count
                from invoices
                where (${filters.status ?? null}::text is null or status = ${filters.status ?? null})
                  and (${filters.status ?? null}::text = ${InvoiceStatus.Deleted} or deleted_at is null)
                  and (${filters.providerId ?? null}::text is null or provider_id = ${filters.providerId ?? null})
            `;

            const total = totalResult[0]?.count ?? 0;
            const items = rows.map((row) => this.mapRowToInvoice(row, []));

            return ok({ items, total });
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('InvoiceRepository', 'Failed to list invoices', cause));
        }
    }

    async getDetail(invoiceId: string): Promise<Result<Invoice | null, PortError>> {
        return this.findById(invoiceId);
    }

    private async fetchMovements(invoiceId: string): Promise<MovementRow[]> {
        const rows = await this.sql<MovementRow[]>`
            select *
            from invoice_movements
            where invoice_id = ${invoiceId}
            order by id
        `;
        return rows;
    }

    private mapRowToInvoice(row: InvoiceRow, movements: MovementRow[]): Invoice {
        const mappedMovements = movements.map((movement) =>
            InvoiceMovement.create({
                id: movement.id,
                concepto: movement.concepto,
                cantidad: Number(movement.cantidad),
                precio: Number(movement.precio),
                ...(movement.base_imponible === null
                    ? {}
                    : { baseImponible: Number(movement.base_imponible) }),
                ...(movement.iva === null ? {} : { iva: Number(movement.iva) }),
                total: Number(movement.total),
                source: this.mapMovementSource(movement.source),
                status: this.mapMovementStatus(movement.status),
            }),
        );

        return Invoice.create({
            id: row.id,
            providerId: row.provider_id,
            status: this.mapInvoiceStatus(row.status),
            headerSource: this.mapHeaderSource(row.header_source),
            headerStatus: this.mapHeaderStatus(row.header_status),
            ...(row.numero_factura ? { numeroFactura: row.numero_factura } : {}),
            ...(row.fecha_operacion
                ? { fechaOperacion: InvoiceDate.create(this.normalizeInvoiceDate(row.fecha_operacion)) }
                : {}),
            ...(row.fecha_vencimiento
                ? { fechaVencimiento: InvoiceDate.create(this.normalizeInvoiceDate(row.fecha_vencimiento)) }
                : {}),
            ...(row.base_imponible === null ? {} : { baseImponible: Money.create(Number(row.base_imponible)) }),
            ...(row.iva === null ? {} : { iva: Money.create(Number(row.iva)) }),
            ...(row.total === null ? {} : { total: Money.create(Number(row.total)) }),
            ...(row.file_storage_key
                ? {
                      fileRef: FileRef.create({
                          storageKey: row.file_storage_key,
                          filename: row.file_filename ?? '',
                          mimeType: row.file_mime_type ?? '',
                          sizeBytes: row.file_size_bytes ?? 0,
                          checksum: row.file_checksum ?? '',
                      }),
                  }
                : {}),
            movements: mappedMovements,
            createdAt: toDate(row.created_at),
            updatedAt: toDate(row.updated_at),
            ...(row.deleted_at ? { deletedAt: toDate(row.deleted_at) } : {}),
        });
    }

    private mapInvoiceStatus(value: string): InvoiceStatus {
        switch (value) {
            case InvoiceStatus.Draft:
                return InvoiceStatus.Draft;
            case InvoiceStatus.Active:
                return InvoiceStatus.Active;
            case InvoiceStatus.Inconsistent:
                return InvoiceStatus.Inconsistent;
            case InvoiceStatus.Deleted:
                return InvoiceStatus.Deleted;
            default:
                return InvoiceStatus.Draft;
        }
    }

    private mapHeaderSource(value: string): InvoiceHeaderSource {
        return value === InvoiceHeaderSource.Ai ? InvoiceHeaderSource.Ai : InvoiceHeaderSource.Manual;
    }

    private mapHeaderStatus(value: string): InvoiceHeaderStatus {
        return value === InvoiceHeaderStatus.Proposed
            ? InvoiceHeaderStatus.Proposed
            : InvoiceHeaderStatus.Confirmed;
    }

    private mapMovementSource(value: string): InvoiceMovementSource {
        return value === InvoiceMovementSource.Ai ? InvoiceMovementSource.Ai : InvoiceMovementSource.Manual;
    }

    private mapMovementStatus(value: string): InvoiceMovementStatus {
        switch (value) {
            case InvoiceMovementStatus.Proposed:
                return InvoiceMovementStatus.Proposed;
            case InvoiceMovementStatus.Rejected:
                return InvoiceMovementStatus.Rejected;
            case InvoiceMovementStatus.Confirmed:
                return InvoiceMovementStatus.Confirmed;
            default:
                return InvoiceMovementStatus.Confirmed;
        }
    }

    /**
     * Normaliza fechas provenientes de Postgres a formato `YYYY-MM-DD`.
     * Acepta `Date` o `string` y recorta timestamps ISO si los hubiera.
     * @param value Fecha desde Postgres (Date o string ISO).
     * @returns Fecha normalizada en formato `YYYY-MM-DD`.
     */
    private normalizeInvoiceDate(value: Date | string): string {
        if (value instanceof Date) {
            return value.toISOString().slice(0, 10);
        }
        if (value.includes('T')) {
            return value.slice(0, 10);
        }
        return value;
    }
}
