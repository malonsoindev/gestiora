import { describe, expect, it } from 'vitest';
import { Provider, ProviderStatus } from '@domain/entities/provider.entity.js';
import type { ProviderProps } from '@domain/entities/provider.entity.js';
import { Cif } from '@domain/value-objects/cif.value-object.js';

const baseDate = new Date('2026-02-01T00:00:00.000Z');

const createProvider = (overrides: Partial<ProviderProps> = {}): Provider =>
    Provider.create({
        id: 'provider-1',
        razonSocial: 'Proveedor Uno',
        cif: Cif.create('B12345678'),
        direccion: 'Calle Falsa 123',
        poblacion: 'Madrid',
        provincia: 'Madrid',
        pais: 'ES',
        status: ProviderStatus.Active,
        createdAt: baseDate,
        updatedAt: baseDate,
        ...overrides,
    });

describe('Provider', () => {
    it('exposes core fields and optional data', () => {
        const deletedAt = new Date('2026-02-05T00:00:00.000Z');
        const provider = createProvider({ deletedAt });

        expect(provider.razonSocial).toBe('Proveedor Uno');
        expect(provider.cif).toBe('B12345678');
        expect(provider.direccion).toBe('Calle Falsa 123');
        expect(provider.poblacion).toBe('Madrid');
        expect(provider.provincia).toBe('Madrid');
        expect(provider.pais).toBe('ES');
        expect(provider.deletedAt).toBe(deletedAt);
    });

    it('returns a new instance when updating provider info', () => {
        const now = new Date('2026-02-02T00:00:00.000Z');
        const provider = createProvider();

        const updated = provider.updateInfo({
            razonSocial: 'Proveedor Actualizado',
            cif: Cif.create('A87654321'),
            direccion: 'Avenida Nueva 4',
            poblacion: 'Sevilla',
            provincia: 'Sevilla',
            pais: 'ES',
            status: ProviderStatus.Inactive,
            updatedAt: now,
        });

        expect(updated).not.toBe(provider);
        expect(updated.razonSocial).toBe('Proveedor Actualizado');
        expect(updated.cif).toBe('A87654321');
        expect(updated.direccion).toBe('Avenida Nueva 4');
        expect(updated.poblacion).toBe('Sevilla');
        expect(updated.provincia).toBe('Sevilla');
        expect(updated.pais).toBe('ES');
        expect(updated.status).toBe(ProviderStatus.Inactive);
        expect(updated.updatedAt).toBe(now);
        expect(updated.createdAt).toBe(provider.createdAt);
    });

    it('supports updating deletedAt', () => {
        const now = new Date('2026-02-03T00:00:00.000Z');
        const provider = createProvider();

        const updated = provider.updateInfo({
            deletedAt: now,
            updatedAt: now,
        });

        expect(updated.deletedAt).toBe(now);
    });
});
