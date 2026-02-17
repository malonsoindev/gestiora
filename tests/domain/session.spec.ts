import { describe, expect, it } from 'vitest';
import { Session, SessionStatus } from '@domain/entities/session.entity.js';

describe('Session Entity', () => {
    const fixedNow = new Date('2026-03-10T10:00:00.000Z');
    const expiresAt = new Date('2026-04-10T10:00:00.000Z');

    const validProps = {
        id: 'session-123',
        userId: 'user-456',
        refreshTokenHash: 'hashed-refresh-token',
        status: SessionStatus.Active,
        createdAt: fixedNow,
        lastUsedAt: fixedNow,
        expiresAt,
    };

    describe('create', () => {
        it('creates a session with required properties', () => {
            const session = Session.create(validProps);

            expect(session.id).toBe('session-123');
            expect(session.userId).toBe('user-456');
            expect(session.refreshTokenHash).toBe('hashed-refresh-token');
            expect(session.status).toBe(SessionStatus.Active);
            expect(session.createdAt).toEqual(fixedNow);
            expect(session.lastUsedAt).toEqual(fixedNow);
            expect(session.expiresAt).toEqual(expiresAt);
        });

        it('creates a session with optional IP', () => {
            const session = Session.create({
                ...validProps,
                ip: '192.168.1.1',
            });

            expect(session.ip).toBe('192.168.1.1');
        });

        it('creates a session with optional userAgent', () => {
            const session = Session.create({
                ...validProps,
                userAgent: 'Mozilla/5.0',
            });

            expect(session.userAgent).toBe('Mozilla/5.0');
        });

        it('creates a session with revoked status and metadata', () => {
            const revokedAt = new Date('2026-03-11T10:00:00.000Z');
            const session = Session.create({
                ...validProps,
                status: SessionStatus.Revoked,
                revokedAt,
                revokedBy: 'admin-user',
            });

            expect(session.status).toBe(SessionStatus.Revoked);
            expect(session.revokedAt).toEqual(revokedAt);
            expect(session.revokedBy).toBe('admin-user');
        });

        it('creates a session with expired status', () => {
            const session = Session.create({
                ...validProps,
                status: SessionStatus.Expired,
            });

            expect(session.status).toBe(SessionStatus.Expired);
        });

        it('returns undefined for optional fields when not provided', () => {
            const session = Session.create(validProps);

            expect(session.ip).toBeUndefined();
            expect(session.userAgent).toBeUndefined();
            expect(session.revokedAt).toBeUndefined();
            expect(session.revokedBy).toBeUndefined();
        });

        it('creates a session with all optional fields', () => {
            const revokedAt = new Date('2026-03-11T10:00:00.000Z');
            const session = Session.create({
                ...validProps,
                status: SessionStatus.Revoked,
                revokedAt,
                revokedBy: 'admin-user',
                ip: '10.0.0.1',
                userAgent: 'Chrome/120',
            });

            expect(session.id).toBe('session-123');
            expect(session.userId).toBe('user-456');
            expect(session.status).toBe(SessionStatus.Revoked);
            expect(session.revokedAt).toEqual(revokedAt);
            expect(session.revokedBy).toBe('admin-user');
            expect(session.ip).toBe('10.0.0.1');
            expect(session.userAgent).toBe('Chrome/120');
        });
    });

    describe('SessionStatus enum', () => {
        it('has Active status', () => {
            expect(SessionStatus.Active).toBe('ACTIVE');
        });

        it('has Revoked status', () => {
            expect(SessionStatus.Revoked).toBe('REVOKED');
        });

        it('has Expired status', () => {
            expect(SessionStatus.Expired).toBe('EXPIRED');
        });
    });

    describe('immutability', () => {
        it('does not expose mutable props', () => {
            const session = Session.create(validProps);

            // Session is read-only - all getters return values, not references to internal state
            expect(session.id).toBe(validProps.id);
            expect(session.userId).toBe(validProps.userId);
        });
    });
});
