import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import type { ProviderProps } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';

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
