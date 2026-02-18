import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import type { ProviderProps } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';
import { fixedNow } from '@tests/shared/fixed-now.js';

type CreateProviderParams = {
    now: Date;
    overrides?: Partial<ProviderProps>;
    omitCif?: boolean;
};

export const createTestProvider = ({ now, overrides, omitCif }: CreateProviderParams): Provider => {
    const resolvedOverrides = overrides ?? {};
    const providerProps: ProviderProps = {
        id: 'provider-1',
        razonSocial: 'Proveedor Uno',
        cif: Cif.create('B12345678'),
        direccion: 'Calle Falsa 123',
        poblacion: 'Madrid',
        provincia: 'Madrid',
        pais: 'ES',
        status: ProviderStatus.Active,
        createdAt: now,
        updatedAt: now,
    };

    if (omitCif) {
        delete (providerProps as Partial<ProviderProps>).cif;
    }

    return Provider.create({
        ...providerProps,
        ...resolvedOverrides,
    });
};

/**
 * Creates an active provider with CIF for use-case tests.
 * Common helper to reduce duplication in provider-related use-case specs.
 */
export const createActiveProvider = (overrides: Partial<ProviderProps> = {}): Provider =>
    createTestProvider({
        now: fixedNow,
        overrides: {
            status: ProviderStatus.Active,
            cif: Cif.create('B12345678'),
            ...overrides,
        },
    });
