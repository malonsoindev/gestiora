import postgres from 'postgres';
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgresProviderRepository } from '@infrastructure/persistence/postgres/postgres-provider.repository.js';
import { ProviderStatus } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { createTestProvider } from '@tests/shared/fixtures/provider.fixture.js';
import { normalizeText } from '@shared/text-utils.js';

const describeIf = process.env.DATABASE_URL ? describe : describe.skip;
const fixedNow = new Date('2026-03-10T10:00:00.000Z');

// Use unique prefix to avoid conflicts with other integration tests and existing data
const TEST_PREFIX = 'prov-repo-test';
const PROVIDER_IDS = {
    one: `${TEST_PREFIX}-1`,
    two: `${TEST_PREFIX}-2`,
    three: `${TEST_PREFIX}-3`,
};

// Unique CIFs for tests
const TEST_CIFS = {
    one: 'Z11223344',
    two: 'Z55667788',
    three: 'Z99001122',
};

describeIf('PostgresProviderRepository', () => {
    const sql = postgres(process.env.DATABASE_URL as string, { max: 1 });
    const repository = new PostgresProviderRepository(sql);

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
    });

    beforeEach(async () => {
        // Clean up invoices first due to FK constraint
        await sql`delete from invoice_movements where invoice_id in (
            select id from invoices where provider_id in (${PROVIDER_IDS.one}, ${PROVIDER_IDS.two}, ${PROVIDER_IDS.three})
        )`;
        await sql`delete from invoices where provider_id in (${PROVIDER_IDS.one}, ${PROVIDER_IDS.two}, ${PROVIDER_IDS.three})`;
        await sql`delete from providers where id in (${PROVIDER_IDS.one}, ${PROVIDER_IDS.two}, ${PROVIDER_IDS.three})`;
    });

    afterAll(async () => {
        await sql.end({ timeout: 5 });
    });

    it('creates and retrieves a provider by id', async () => {
        const provider = createTestProvider({
            now: fixedNow,
            overrides: {
                id: PROVIDER_IDS.one,
                razonSocial: 'ProvRepoTest CreateRetrieve',
                cif: Cif.create(TEST_CIFS.one),
            },
        });

        const createResult = await repository.create(provider);
        expect(createResult.success).toBe(true);

        const findResult = await repository.findById(provider.id);

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value?.id).toBe(PROVIDER_IDS.one);
            expect(findResult.value?.razonSocial).toBe('ProvRepoTest CreateRetrieve');
            expect(findResult.value?.cif).toBe(TEST_CIFS.one);
            expect(findResult.value?.status).toBe(ProviderStatus.Active);
        }
    });

    it('returns null when provider not found', async () => {
        const findResult = await repository.findById('non-existent-id');

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value).toBeNull();
        }
    });

    it('updates an existing provider', async () => {
        const provider = createTestProvider({
            now: fixedNow,
            overrides: {
                id: PROVIDER_IDS.one,
                razonSocial: 'ProvRepoTest Update Original',
                cif: Cif.create(TEST_CIFS.one),
            },
        });
        await repository.create(provider);

        const updatedAt = new Date('2026-03-11T10:00:00.000Z');
        const updated = provider.updateInfo({
            razonSocial: 'ProvRepoTest Update Modified',
            status: ProviderStatus.Inactive,
            updatedAt,
        });

        const updateResult = await repository.update(updated);
        const findResult = await repository.findById(provider.id);

        expect(updateResult.success).toBe(true);
        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.razonSocial).toBe('ProvRepoTest Update Modified');
            expect(findResult.value.status).toBe(ProviderStatus.Inactive);
        }
    });

    it('finds provider by CIF', async () => {
        const provider = createTestProvider({
            now: fixedNow,
            overrides: {
                id: PROVIDER_IDS.one,
                razonSocial: 'ProvRepoTest FindByCif',
                cif: Cif.create(TEST_CIFS.one),
            },
        });
        await repository.create(provider);

        const findResult = await repository.findByCif(TEST_CIFS.one);

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value?.id).toBe(PROVIDER_IDS.one);
            expect(findResult.value?.cif).toBe(TEST_CIFS.one);
        }
    });

    it('returns null when CIF not found', async () => {
        const findResult = await repository.findByCif('X99999999');

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value).toBeNull();
        }
    });

    it('finds provider by normalized razon social', async () => {
        const provider = createTestProvider({
            now: fixedNow,
            overrides: {
                id: PROVIDER_IDS.one,
                razonSocial: 'ProvRepoTest FindByRazonSocial',
                cif: Cif.create(TEST_CIFS.one),
            },
        });
        await repository.create(provider);

        const normalized = normalizeText('ProvRepoTest FindByRazonSocial');
        const findResult = await repository.findByRazonSocialNormalized(normalized);

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value?.id).toBe(PROVIDER_IDS.one);
        }
    });

    it('lists providers with pagination', async () => {
        const provider1 = createTestProvider({
            now: fixedNow,
            overrides: {
                id: PROVIDER_IDS.one,
                razonSocial: 'ProvRepoTest Pagination Uno',
                cif: Cif.create(TEST_CIFS.one),
            },
        });
        const provider2 = createTestProvider({
            now: new Date('2026-03-11T10:00:00.000Z'),
            overrides: {
                id: PROVIDER_IDS.two,
                razonSocial: 'ProvRepoTest Pagination Dos',
                cif: Cif.create(TEST_CIFS.two),
            },
        });

        const create1Result = await repository.create(provider1);
        const create2Result = await repository.create(provider2);

        expect(create1Result.success).toBe(true);
        expect(create2Result.success).toBe(true);

        // Use search query to filter only our test providers
        const listResult = await repository.list({
            page: 1,
            pageSize: 10,
            q: 'ProvRepoTest Pagination',
        });

        expect(listResult.success).toBe(true);
        if (listResult.success) {
            expect(listResult.value.items).toHaveLength(2);
            expect(listResult.value.total).toBe(2);
            // Ordered by created_at desc, so provider-2 should be first
            expect(listResult.value.items[0]?.id).toBe(PROVIDER_IDS.two);
        }
    });

    it('lists providers filtered by status', async () => {
        const activeProvider = createTestProvider({
            now: fixedNow,
            overrides: {
                id: PROVIDER_IDS.one,
                razonSocial: 'ProvRepoTest Status Active',
                cif: Cif.create(TEST_CIFS.one),
            },
        });
        const inactiveProvider = createTestProvider({
            now: fixedNow,
            overrides: {
                id: PROVIDER_IDS.two,
                razonSocial: 'ProvRepoTest Status Inactive',
                cif: Cif.create(TEST_CIFS.two),
                status: ProviderStatus.Inactive,
            },
        });

        await repository.create(activeProvider);
        await repository.create(inactiveProvider);

        const listResult = await repository.list({
            page: 1,
            pageSize: 10,
            status: ProviderStatus.Active,
            q: 'ProvRepoTest Status',
        });

        expect(listResult.success).toBe(true);
        if (listResult.success) {
            expect(listResult.value.items).toHaveLength(1);
            expect(listResult.value.items[0]?.status).toBe(ProviderStatus.Active);
        }
    });

    it('lists providers filtered by search query', async () => {
        const provider1 = createTestProvider({
            now: fixedNow,
            overrides: {
                id: PROVIDER_IDS.one,
                razonSocial: 'ProvRepoTest Search Match',
                cif: Cif.create(TEST_CIFS.one),
            },
        });
        const provider2 = createTestProvider({
            now: fixedNow,
            overrides: {
                id: PROVIDER_IDS.two,
                razonSocial: 'ProvRepoTest Search Diferente',
                cif: Cif.create(TEST_CIFS.two),
            },
        });

        await repository.create(provider1);
        await repository.create(provider2);

        const listResult = await repository.list({
            page: 1,
            pageSize: 10,
            q: 'ProvRepoTest Search Match',
        });

        expect(listResult.success).toBe(true);
        if (listResult.success) {
            expect(listResult.value.items).toHaveLength(1);
            expect(listResult.value.items[0]?.razonSocial).toBe('ProvRepoTest Search Match');
        }
    });

    it('excludes deleted providers from findByCif', async () => {
        const deletedAt = new Date('2026-03-12T10:00:00.000Z');
        const provider = createTestProvider({
            now: fixedNow,
            overrides: {
                id: PROVIDER_IDS.one,
                razonSocial: 'ProvRepoTest Deleted CIF',
                cif: Cif.create(TEST_CIFS.one),
                status: ProviderStatus.Deleted,
                deletedAt,
            },
        });

        await repository.create(provider);

        const findResult = await repository.findByCif(TEST_CIFS.one);

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value).toBeNull();
        }
    });

    it('excludes deleted providers from findByRazonSocialNormalized', async () => {
        const deletedAt = new Date('2026-03-12T10:00:00.000Z');
        const provider = createTestProvider({
            now: fixedNow,
            overrides: {
                id: PROVIDER_IDS.one,
                razonSocial: 'ProvRepoTest Deleted Razon',
                cif: Cif.create(TEST_CIFS.one),
                status: ProviderStatus.Deleted,
                deletedAt,
            },
        });

        await repository.create(provider);

        const normalized = normalizeText('ProvRepoTest Deleted Razon');
        const findResult = await repository.findByRazonSocialNormalized(normalized);

        expect(findResult.success).toBe(true);
        if (findResult.success) {
            expect(findResult.value).toBeNull();
        }
    });

    it('creates provider without optional CIF', async () => {
        const provider = createTestProvider({
            now: fixedNow,
            omitCif: true,
            overrides: {
                id: PROVIDER_IDS.three,
                razonSocial: 'ProvRepoTest No CIF',
            },
        });

        const createResult = await repository.create(provider);
        const findResult = await repository.findById(PROVIDER_IDS.three);

        expect(createResult.success).toBe(true);
        expect(findResult.success).toBe(true);
        if (findResult.success && findResult.value) {
            expect(findResult.value.cif).toBeUndefined();
            expect(findResult.value.razonSocial).toBe('ProvRepoTest No CIF');
        }
    });
});
