import { describe, expect, it } from 'vitest';
import { InvoiceMovement, InvoiceMovementStatus } from '@domain/entities/invoice-movement.entity.js';
import { DataSource } from '@domain/enums/data-source.enum.js';

describe('InvoiceMovement Entity', () => {
    const validProps = {
        id: 'movement-123',
        concepto: 'Servicio de consultoría',
        cantidad: 10,
        precio: 100,
        total: 1000,
    };

    describe('create', () => {
        it('creates a movement with required properties', () => {
            const movement = InvoiceMovement.create(validProps);

            expect(movement.id).toBe('movement-123');
            expect(movement.concepto).toBe('Servicio de consultoría');
            expect(movement.cantidad).toBe(10);
            expect(movement.precio).toBe(100);
            expect(movement.total).toBe(1000);
        });

        it('defaults source to Manual when not provided', () => {
            const movement = InvoiceMovement.create(validProps);

            expect(movement.source).toBe(DataSource.Manual);
        });

        it('defaults status to Confirmed when not provided', () => {
            const movement = InvoiceMovement.create(validProps);

            expect(movement.status).toBe(InvoiceMovementStatus.Confirmed);
        });

        it('creates a movement with AI source', () => {
            const movement = InvoiceMovement.create({
                ...validProps,
                source: DataSource.Ai,
            });

            expect(movement.source).toBe(DataSource.Ai);
        });

        it('creates a movement with Proposed status', () => {
            const movement = InvoiceMovement.create({
                ...validProps,
                status: InvoiceMovementStatus.Proposed,
            });

            expect(movement.status).toBe(InvoiceMovementStatus.Proposed);
        });

        it('creates a movement with Rejected status', () => {
            const movement = InvoiceMovement.create({
                ...validProps,
                status: InvoiceMovementStatus.Rejected,
            });

            expect(movement.status).toBe(InvoiceMovementStatus.Rejected);
        });

        it('creates a movement with optional baseImponible', () => {
            const movement = InvoiceMovement.create({
                ...validProps,
                baseImponible: 826.45,
            });

            expect(movement.baseImponible).toBe(826.45);
        });

        it('creates a movement with optional iva', () => {
            const movement = InvoiceMovement.create({
                ...validProps,
                iva: 21,
            });

            expect(movement.iva).toBe(21);
        });

        it('creates a movement with all optional fields', () => {
            const movement = InvoiceMovement.create({
                ...validProps,
                baseImponible: 826.45,
                iva: 21,
                source: DataSource.Ai,
                status: InvoiceMovementStatus.Proposed,
            });

            expect(movement.baseImponible).toBe(826.45);
            expect(movement.iva).toBe(21);
            expect(movement.source).toBe(DataSource.Ai);
            expect(movement.status).toBe(InvoiceMovementStatus.Proposed);
        });

        it('returns undefined for optional fields when not provided', () => {
            const movement = InvoiceMovement.create(validProps);

            expect(movement.baseImponible).toBeUndefined();
            expect(movement.iva).toBeUndefined();
        });
    });

    describe('InvoiceMovementStatus enum', () => {
        it('has Proposed status', () => {
            expect(InvoiceMovementStatus.Proposed).toBe('PROPOSED');
        });

        it('has Confirmed status', () => {
            expect(InvoiceMovementStatus.Confirmed).toBe('CONFIRMED');
        });

        it('has Rejected status', () => {
            expect(InvoiceMovementStatus.Rejected).toBe('REJECTED');
        });
    });

    describe('numeric properties', () => {
        it('handles decimal values for cantidad', () => {
            const movement = InvoiceMovement.create({
                ...validProps,
                cantidad: 2.5,
            });

            expect(movement.cantidad).toBe(2.5);
        });

        it('handles decimal values for precio', () => {
            const movement = InvoiceMovement.create({
                ...validProps,
                precio: 99.99,
            });

            expect(movement.precio).toBe(99.99);
        });

        it('handles decimal values for total', () => {
            const movement = InvoiceMovement.create({
                ...validProps,
                total: 1234.56,
            });

            expect(movement.total).toBe(1234.56);
        });

        it('handles zero values', () => {
            const movement = InvoiceMovement.create({
                ...validProps,
                cantidad: 0,
                precio: 0,
                total: 0,
            });

            expect(movement.cantidad).toBe(0);
            expect(movement.precio).toBe(0);
            expect(movement.total).toBe(0);
        });

        it('handles negative values', () => {
            const movement = InvoiceMovement.create({
                ...validProps,
                cantidad: -1,
                total: -100,
            });

            expect(movement.cantidad).toBe(-1);
            expect(movement.total).toBe(-100);
        });
    });

    describe('immutability', () => {
        it('does not expose mutable props', () => {
            const movement = InvoiceMovement.create(validProps);

            // Movement is read-only - all getters return values
            expect(movement.id).toBe(validProps.id);
            expect(movement.concepto).toBe(validProps.concepto);
        });
    });
});
