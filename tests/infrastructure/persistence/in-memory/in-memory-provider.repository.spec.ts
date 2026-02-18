import { describe, expect, it } from 'vitest';
import { InMemoryProviderRepository } from '@infrastructure/persistence/in-memory/in-memory-provider.repository.js';
import { ProviderStatus } from '@domain/entities/provider.entity.js';
import { providerRepositoryContract } from '@tests/infrastructure/persistence/contracts/provider-repository.contract.js';
import { createTestProvider } from '@tests/shared/builders/provider.builder.js';

const TEST_PREFIX = 'mem-prov-test';

describe('InMemoryProviderRepository', () => {
    // Reset repository before each test via a fresh instance
    const getRepository = () => new InMemoryProviderRepository();

    // Run contract tests
    providerRepositoryContract({
        getRepository,
        testPrefix: TEST_PREFIX,
    });

    // Implementation-specific tests
    describe('InMemory-specific behavior', () => {
        it('can be initialized with existing providers', async () => {
            const activeProvider = createTestProvider({ id: 'provider-1' });
            const deletedProvider = createTestProvider({
                id: 'provider-2',
                status: ProviderStatus.Deleted,
                deletedAt: new Date('2026-02-01T00:00:00.000Z'),
            });

            const repository = new InMemoryProviderRepository([activeProvider, deletedProvider]);
            const result = await repository.list({ page: 1, pageSize: 20 });

            expect(result.success).toBe(true);
            if (result.success) {
                // Default list excludes deleted
                expect(result.value.items).toHaveLength(1);
                expect(result.value.items[0]?.id).toBe('provider-1');
            }
        });

        it('includes deleted providers when filtering by status deleted', async () => {
            const deletedProvider = createTestProvider({
                id: 'provider-deleted',
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
                expect(result.value.items[0]?.id).toBe('provider-deleted');
            }
        });
    });
});
