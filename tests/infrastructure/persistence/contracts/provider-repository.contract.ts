import { describe, expect, it } from 'vitest';
import type { ProviderRepository } from '@application/ports/provider.repository.js';
import { ProviderStatus } from '@domain/entities/provider.entity.js';
import { normalizeText } from '@shared/text-utils.js';
import {
    createTestProvider,
    createTestProviderIds,
    createTestCifs,
    FIXED_NOW,
} from '@tests/shared/builders/provider.builder.js';

/**
 * Context required to run the ProviderRepository contract tests.
 */
export interface ProviderRepositoryContractContext {
    /** Returns the repository instance to test */
    getRepository: () => ProviderRepository;
    /** Unique prefix to avoid conflicts between test runs */
    testPrefix: string;
}

/**
 * Contract tests for ProviderRepository implementations.
 * These tests verify that any implementation correctly fulfills the ProviderRepository interface.
 *
 * Usage:
 * ```ts
 * providerRepositoryContract({
 *   getRepository: () => repository,
 *   testPrefix: 'postgres-provider-test',
 * });
 * ```
 */
export function providerRepositoryContract(ctx: ProviderRepositoryContractContext): void {
    const PROVIDER_IDS = createTestProviderIds(ctx.testPrefix);
    const TEST_CIFS = createTestCifs(ctx.testPrefix);

    describe('ProviderRepository Contract', () => {
        it('creates and retrieves a provider by id', async () => {
            const repository = ctx.getRepository();
            const provider = createTestProvider({
                id: PROVIDER_IDS.one,
                razonSocial: `${ctx.testPrefix} CreateRetrieve`,
                cif: TEST_CIFS.one,
            });

            const createResult = await repository.create(provider);
            expect(createResult.success).toBe(true);

            const findResult = await repository.findById(provider.id);

            expect(findResult.success).toBe(true);
            if (findResult.success) {
                expect(findResult.value?.id).toBe(PROVIDER_IDS.one);
                expect(findResult.value?.razonSocial).toBe(`${ctx.testPrefix} CreateRetrieve`);
                expect(findResult.value?.cif).toBe(TEST_CIFS.one);
                expect(findResult.value?.status).toBe(ProviderStatus.Active);
            }
        });

        it('returns null when provider not found by id', async () => {
            const repository = ctx.getRepository();
            const findResult = await repository.findById('non-existent-id');

            expect(findResult.success).toBe(true);
            if (findResult.success) {
                expect(findResult.value).toBeNull();
            }
        });

        it('updates an existing provider', async () => {
            const repository = ctx.getRepository();
            const provider = createTestProvider({
                id: PROVIDER_IDS.one,
                razonSocial: `${ctx.testPrefix} Update Original`,
                cif: TEST_CIFS.one,
            });
            await repository.create(provider);

            const updatedAt = new Date('2026-03-11T10:00:00.000Z');
            const updated = provider.updateInfo({
                razonSocial: `${ctx.testPrefix} Update Modified`,
                status: ProviderStatus.Inactive,
                updatedAt,
            });

            const updateResult = await repository.update(updated);
            const findResult = await repository.findById(provider.id);

            expect(updateResult.success).toBe(true);
            expect(findResult.success).toBe(true);
            if (findResult.success && findResult.value) {
                expect(findResult.value.razonSocial).toBe(`${ctx.testPrefix} Update Modified`);
                expect(findResult.value.status).toBe(ProviderStatus.Inactive);
            }
        });

        it('finds provider by CIF', async () => {
            const repository = ctx.getRepository();
            const provider = createTestProvider({
                id: PROVIDER_IDS.one,
                razonSocial: `${ctx.testPrefix} FindByCif`,
                cif: TEST_CIFS.one,
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
            const repository = ctx.getRepository();
            const findResult = await repository.findByCif('X99999999');

            expect(findResult.success).toBe(true);
            if (findResult.success) {
                expect(findResult.value).toBeNull();
            }
        });

        it('finds provider by normalized razon social', async () => {
            const repository = ctx.getRepository();
            const razonSocial = `${ctx.testPrefix} FindByRazonSocial`;
            const provider = createTestProvider({
                id: PROVIDER_IDS.one,
                razonSocial,
                cif: TEST_CIFS.one,
            });
            await repository.create(provider);

            const normalized = normalizeText(razonSocial);
            const findResult = await repository.findByRazonSocialNormalized(normalized);

            expect(findResult.success).toBe(true);
            if (findResult.success) {
                expect(findResult.value?.id).toBe(PROVIDER_IDS.one);
            }
        });

        it('lists providers with pagination', async () => {
            const repository = ctx.getRepository();
            const provider1 = createTestProvider({
                id: PROVIDER_IDS.one,
                razonSocial: `${ctx.testPrefix} Pagination Uno`,
                cif: TEST_CIFS.one,
            });
            const provider2 = createTestProvider({
                id: PROVIDER_IDS.two,
                razonSocial: `${ctx.testPrefix} Pagination Dos`,
                cif: TEST_CIFS.two,
                createdAt: new Date('2026-03-11T10:00:00.000Z'),
            });

            await repository.create(provider1);
            await repository.create(provider2);

            const listResult = await repository.list({
                page: 1,
                pageSize: 100,
                q: `${ctx.testPrefix} Pagination`,
            });

            expect(listResult.success).toBe(true);
            if (listResult.success) {
                const ids = listResult.value.items.map((p) => p.id);
                expect(ids).toContain(PROVIDER_IDS.one);
                expect(ids).toContain(PROVIDER_IDS.two);
            }
        });

        it('lists providers filtered by status', async () => {
            const repository = ctx.getRepository();
            const activeProvider = createTestProvider({
                id: PROVIDER_IDS.one,
                razonSocial: `${ctx.testPrefix} Status Active`,
                cif: TEST_CIFS.one,
            });
            const inactiveProvider = createTestProvider({
                id: PROVIDER_IDS.two,
                razonSocial: `${ctx.testPrefix} Status Inactive`,
                cif: TEST_CIFS.two,
                status: ProviderStatus.Inactive,
            });

            await repository.create(activeProvider);
            await repository.create(inactiveProvider);

            const listResult = await repository.list({
                page: 1,
                pageSize: 100,
                status: ProviderStatus.Active,
                q: `${ctx.testPrefix} Status`,
            });

            expect(listResult.success).toBe(true);
            if (listResult.success) {
                const ids = listResult.value.items.map((p) => p.id);
                expect(ids).toContain(PROVIDER_IDS.one);
                expect(ids).not.toContain(PROVIDER_IDS.two);
            }
        });

        it('lists providers filtered by search query', async () => {
            const repository = ctx.getRepository();
            const provider1 = createTestProvider({
                id: PROVIDER_IDS.one,
                razonSocial: `${ctx.testPrefix} Search Match`,
                cif: TEST_CIFS.one,
            });
            const provider2 = createTestProvider({
                id: PROVIDER_IDS.two,
                razonSocial: `${ctx.testPrefix} Search Diferente`,
                cif: TEST_CIFS.two,
            });

            await repository.create(provider1);
            await repository.create(provider2);

            const listResult = await repository.list({
                page: 1,
                pageSize: 100,
                q: `${ctx.testPrefix} Search Match`,
            });

            expect(listResult.success).toBe(true);
            if (listResult.success) {
                expect(listResult.value.items).toHaveLength(1);
                expect(listResult.value.items[0]?.razonSocial).toBe(`${ctx.testPrefix} Search Match`);
            }
        });

        it('excludes deleted providers from findByCif', async () => {
            const repository = ctx.getRepository();
            const deletedAt = new Date('2026-03-12T10:00:00.000Z');
            const provider = createTestProvider({
                id: PROVIDER_IDS.one,
                razonSocial: `${ctx.testPrefix} Deleted CIF`,
                cif: TEST_CIFS.one,
                status: ProviderStatus.Deleted,
                deletedAt,
            });

            await repository.create(provider);

            const findResult = await repository.findByCif(TEST_CIFS.one);

            expect(findResult.success).toBe(true);
            if (findResult.success) {
                expect(findResult.value).toBeNull();
            }
        });

        it('excludes deleted providers from findByRazonSocialNormalized', async () => {
            const repository = ctx.getRepository();
            const deletedAt = new Date('2026-03-12T10:00:00.000Z');
            const razonSocial = `${ctx.testPrefix} Deleted Razon`;
            const provider = createTestProvider({
                id: PROVIDER_IDS.one,
                razonSocial,
                cif: TEST_CIFS.one,
                status: ProviderStatus.Deleted,
                deletedAt,
            });

            await repository.create(provider);

            const normalized = normalizeText(razonSocial);
            const findResult = await repository.findByRazonSocialNormalized(normalized);

            expect(findResult.success).toBe(true);
            if (findResult.success) {
                expect(findResult.value).toBeNull();
            }
        });

        it('creates provider without optional CIF', async () => {
            const repository = ctx.getRepository();
            const provider = createTestProvider({
                id: PROVIDER_IDS.three,
                razonSocial: `${ctx.testPrefix} No CIF`,
                omitCif: true,
            });

            const createResult = await repository.create(provider);
            const findResult = await repository.findById(PROVIDER_IDS.three);

            expect(createResult.success).toBe(true);
            expect(findResult.success).toBe(true);
            if (findResult.success && findResult.value) {
                expect(findResult.value.cif).toBeUndefined();
                expect(findResult.value.razonSocial).toBe(`${ctx.testPrefix} No CIF`);
            }
        });
    });
}
