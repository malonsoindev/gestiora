import type { Sql } from 'postgres';
import { fail, ok, type Result } from '@shared/result.js';
import { toDate } from '@shared/date-utils.js';
import { mapEnumValue } from '@shared/enum-utils.js';
import { normalizeText } from '@shared/text-utils.js';
import { PortError } from '@application/errors/port.error.js';
import type {
    ProviderListFilters,
    ProviderListResult,
    ProviderRepository,
} from '@application/ports/provider.repository.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';

type SqlClient = Sql<{}>;

export class PostgresProviderRepository implements ProviderRepository {
    constructor(private readonly sql: SqlClient) {}

    async create(provider: Provider): Promise<Result<void, PortError>> {
        try {
            await this.sql`
                insert into providers (
                    id,
                    razon_social,
                    razon_social_normalized,
                    cif,
                    direccion,
                    poblacion,
                    provincia,
                    pais,
                    status,
                    created_at,
                    updated_at,
                    deleted_at
                ) values (
                    ${provider.id},
                    ${provider.razonSocial},
                    ${normalizeText(provider.razonSocial)},
                    ${provider.cif ?? null},
                    ${provider.direccion ?? null},
                    ${provider.poblacion ?? null},
                    ${provider.provincia ?? null},
                    ${provider.pais ?? null},
                    ${provider.status},
                    ${provider.createdAt},
                    ${provider.updatedAt},
                    ${provider.deletedAt ?? null}
                )
            `;

            return ok(undefined);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('ProviderRepository', 'Failed to create provider', cause));
        }
    }

    async update(provider: Provider): Promise<Result<void, PortError>> {
        try {
            await this.sql`
                update providers
                set
                    razon_social = ${provider.razonSocial},
                    razon_social_normalized = ${normalizeText(provider.razonSocial)},
                    cif = ${provider.cif ?? null},
                    direccion = ${provider.direccion ?? null},
                    poblacion = ${provider.poblacion ?? null},
                    provincia = ${provider.provincia ?? null},
                    pais = ${provider.pais ?? null},
                    status = ${provider.status},
                    updated_at = ${provider.updatedAt},
                    deleted_at = ${provider.deletedAt ?? null}
                where id = ${provider.id}
            `;

            return ok(undefined);
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('ProviderRepository', 'Failed to update provider', cause));
        }
    }

    async findById(providerId: string): Promise<Result<Provider | null, PortError>> {
        try {
            const rows = await this.sql`
                select
                    id,
                    razon_social,
                    cif,
                    direccion,
                    poblacion,
                    provincia,
                    pais,
                    status,
                    created_at,
                    updated_at,
                    deleted_at
                from providers
                where id = ${providerId}
                limit 1
            `;

            const row = rows[0];
            if (!row) {
                return ok(null);
            }

            return ok(this.mapRowToProvider(row));
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('ProviderRepository', 'Failed to fetch provider by id', cause));
        }
    }

    async list(filters: ProviderListFilters): Promise<Result<ProviderListResult, PortError>> {
        try {
            const offset = (filters.page - 1) * filters.pageSize;
            const normalizedQuery = filters.q ? normalizeText(filters.q) : null;

            const rows = await this.sql`
                select
                    id,
                    razon_social,
                    cif,
                    direccion,
                    poblacion,
                    provincia,
                    pais,
                    status,
                    created_at,
                    updated_at,
                    deleted_at
                from providers
                where (${filters.status ?? null}::text is null or status = ${filters.status ?? null})
                  and (${filters.status ?? null}::text = ${ProviderStatus.Deleted} or deleted_at is null)
                  and (${normalizedQuery}::text is null or razon_social_normalized like ${normalizedQuery ? `%${normalizedQuery}%` : null})
                order by created_at desc
                limit ${filters.pageSize}
                offset ${offset}
            `;

            const totalResult = await this.sql`
                select count(*)::int as count
                from providers
                where (${filters.status ?? null}::text is null or status = ${filters.status ?? null})
                  and (${filters.status ?? null}::text = ${ProviderStatus.Deleted} or deleted_at is null)
                  and (${normalizedQuery}::text is null or razon_social_normalized like ${normalizedQuery ? `%${normalizedQuery}%` : null})
            `;

            const total = totalResult[0]?.count ?? 0;
            const items = rows.map((row) => this.mapRowToProvider(row));

            return ok({ items, total });
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('ProviderRepository', 'Failed to list providers', cause));
        }
    }

    async findByCif(cif: string): Promise<Result<Provider | null, PortError>> {
        try {
            const rows = await this.sql`
                select
                    id,
                    razon_social,
                    cif,
                    direccion,
                    poblacion,
                    provincia,
                    pais,
                    status,
                    created_at,
                    updated_at,
                    deleted_at
                from providers
                where cif = ${cif}
                  and deleted_at is null
                limit 1
            `;

            const row = rows[0];
            if (!row) {
                return ok(null);
            }

            return ok(this.mapRowToProvider(row));
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('ProviderRepository', 'Failed to fetch provider by cif', cause));
        }
    }

    async findByRazonSocialNormalized(normalized: string): Promise<Result<Provider | null, PortError>> {
        try {
            const rows = await this.sql`
                select
                    id,
                    razon_social,
                    cif,
                    direccion,
                    poblacion,
                    provincia,
                    pais,
                    status,
                    created_at,
                    updated_at,
                    deleted_at
                from providers
                where razon_social_normalized = ${normalized}
                  and deleted_at is null
                limit 1
            `;

            const row = rows[0];
            if (!row) {
                return ok(null);
            }

            return ok(this.mapRowToProvider(row));
        } catch (error) {
            const cause = error instanceof Error ? error : new Error('Unknown error');
            return fail(new PortError('ProviderRepository', 'Failed to fetch provider by normalized razon social', cause));
        }
    }

    private mapRowToProvider(row: Record<string, unknown>): Provider {
        const toOptionalString = (value: unknown): string | undefined =>
            typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
        const statusValue = String(row.status);
        const status = mapEnumValue(ProviderStatus, statusValue, ProviderStatus.Active);
        const cifValue = toOptionalString(row.cif);
        const cif = cifValue ? Cif.create(cifValue) : undefined;
        const direccion = toOptionalString(row.direccion);
        const poblacion = toOptionalString(row.poblacion);
        const provincia = toOptionalString(row.provincia);
        const pais = toOptionalString(row.pais);

        return Provider.create({
            id: String(row.id),
            razonSocial: String(row.razon_social),
            ...(cif ? { cif } : {}),
            ...(direccion ? { direccion } : {}),
            ...(poblacion ? { poblacion } : {}),
            ...(provincia ? { provincia } : {}),
            ...(pais ? { pais } : {}),
            status,
            createdAt: toDate(row.created_at),
            updatedAt: toDate(row.updated_at),
            ...(row.deleted_at ? { deletedAt: toDate(row.deleted_at) } : {}),
        });
    }
}

