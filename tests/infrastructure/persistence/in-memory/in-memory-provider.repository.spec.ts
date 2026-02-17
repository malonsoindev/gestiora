import { describe, expect, it } from 'vitest';
import { InMemoryProviderRepository } from '@infrastructure/persistence/in-memory/in-memory-provider.repository.js';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import type { ProviderProps } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { createTestProvider } from '@tests/shared/fixtures/provider.fixture.js';

const fixedNow = new Date('2026-02-07T12:00:00.000Z');

const createProvider = (overrides: Partial<ProviderProps> = {}): Provider =>
    createTestProvider({
        now: fixedNow,
        overrides: {
            status: ProviderStatus.Active,
            cif: Cif.create('B12345678'),
            ...overrides,
        },
    });

describe('InMemoryProviderRepository', () => {
    it('excludes deleted providers by default', async () => {
        const activeProvider = createProvider({ id: 'provider-1' });
        const deletedProvider = createProvider({
            id: 'provider-2',
            status: ProviderStatus.Deleted,
            deletedAt: new Date('2026-02-01T00:00:00.000Z'),
        });

        const repository = new InMemoryProviderRepository([activeProvider, deletedProvider]);
        const result = await repository.list({ page: 1, pageSize: 20 });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.items).toHaveLength(1);
            expect(result.value.items[0]?.id).toBe('provider-1');
        }
    });

    it('includes deleted providers when filtering by status deleted', async () => {
        const deletedProvider = createProvider({
            id: 'provider-2',
            status: ProviderStatus.Deleted,
            deletedAt: new Date('2026-02-01T00:00:00.000Z'),
        });

        const repository = new InMemoryProviderRepository([deletedProvider]);
        const result = await repository.list({
            page: 1,
            pageSize: 20,
            status: ProviderStatus.Deleted,
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.items).toHaveLength(1);
            expect(result.value.items[0]?.id).toBe('provider-2');
        }
    });
});
