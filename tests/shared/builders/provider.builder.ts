import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import type { ProviderProps } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';

export const FIXED_NOW = new Date('2026-03-10T10:00:00.000Z');

export interface ProviderBuilderOverrides {
    id?: string;
    razonSocial?: string;
    cif?: string;
    omitCif?: boolean;
    direccion?: string;
    poblacion?: string;
    provincia?: string;
    pais?: string;
    status?: ProviderStatus;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

/**
 * Creates a test Provider entity with sensible defaults.
 * Set omitCif: true to create a provider without CIF.
 */
export function createTestProvider(overrides: ProviderBuilderOverrides = {}): Provider {
    const props: ProviderProps = {
        id: overrides.id ?? 'provider-1',
        razonSocial: overrides.razonSocial ?? 'Proveedor Uno',
        direccion: overrides.direccion ?? 'Calle Falsa 123',
        poblacion: overrides.poblacion ?? 'Madrid',
        provincia: overrides.provincia ?? 'Madrid',
        pais: overrides.pais ?? 'ES',
        status: overrides.status ?? ProviderStatus.Active,
        createdAt: overrides.createdAt ?? FIXED_NOW,
        updatedAt: overrides.updatedAt ?? FIXED_NOW,
    };

    if (!overrides.omitCif) {
        props.cif = Cif.create(overrides.cif ?? 'B12345678');
    }

    if (overrides.deletedAt !== undefined) {
        props.deletedAt = overrides.deletedAt;
    }

    return Provider.create(props);
}

/**
 * Generates unique test IDs with a given prefix.
 */
export function createTestProviderIds(prefix: string) {
    return {
        one: `${prefix}-prov-1`,
        two: `${prefix}-prov-2`,
        three: `${prefix}-prov-3`,
    };
}

/**
 * Generates unique test CIFs for contract tests.
 */
export function createTestCifs(prefix: string) {
    // Using different letter prefixes to ensure uniqueness
    const hash = prefix.length % 10;
    return {
        one: `A${hash}1223344`,
        two: `B${hash}5667788`,
        three: `C${hash}9001122`,
    };
}
