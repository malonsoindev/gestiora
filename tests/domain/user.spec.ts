import { describe, expect, it } from 'vitest';
import { User, UserStatus } from '../../src/domain/entities/user.entity.js';
import { Email } from '../../src/domain/value-objects/email.value-object.js';
import type { UserProps } from '../../src/domain/entities/user.entity.js';
import { UserRole } from '../../src/domain/value-objects/user-role.value-object.js';

const baseDate = new Date('2026-01-01T00:00:00.000Z');

const createUser = (overrides: Partial<UserProps> = {}): User => {
    const user = User.create({
        id: 'user-1',
        email: Email.create('user@example.com'),
        passwordHash: 'hash',
        status: UserStatus.Active,
        lockedUntil: undefined,
        roles: [UserRole.user()],
        createdAt: baseDate,
        updatedAt: baseDate,
        ...overrides,
    });

    return user;
};

describe('User', () => {
    it('reports active status correctly', () => {
        const activeUser = createUser({ status: UserStatus.Active });

        expect(activeUser.isActive()).toBe(true);
    });

    it('reports inactive status correctly', () => {
        const inactiveUser = createUser({ status: UserStatus.Inactive });

        expect(inactiveUser.isActive()).toBe(false);
    });

    it('reports deleted status correctly', () => {
        const deletedUser = createUser({ status: UserStatus.Deleted });

        expect(deletedUser.isActive()).toBe(false);
    });

    it('detects a user lock when lock is in the future', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const lockedUser = createUser({
            lockedUntil: new Date('2026-01-01T00:10:00.000Z'),
        });

        expect(lockedUser.isLocked(now)).toBe(true);
    });

    it('does not treat a user as locked when lock expired', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const unlockedUser = createUser({
            lockedUntil: new Date('2025-12-31T23:50:00.000Z'),
        });

        expect(unlockedUser.isLocked(now)).toBe(false);
    });

    it('does not treat a user as locked when no lock is set', () => {
        const now = new Date('2026-01-01T00:00:00.000Z');
        const unlockedUser = createUser({ lockedUntil: undefined });

        expect(unlockedUser.isLocked(now)).toBe(false);
    });

    it('exposes optional profile fields when provided', () => {
        const deletedAt = new Date('2026-01-05T00:00:00.000Z');
        const user = createUser({
            name: 'Test User',
            avatar: 'avatar.png',
            deletedAt,
        });

        expect(user.name).toBe('Test User');
        expect(user.avatar).toBe('avatar.png');
        expect(user.deletedAt).toBe(deletedAt);
    });

    it('returns an updated user when updating profile info', () => {
        const now = new Date('2026-01-02T00:00:00.000Z');
        const user = createUser({
            name: 'Old Name',
            avatar: 'old.png',
            roles: [UserRole.user()],
            status: UserStatus.Active,
            updatedAt: baseDate,
        });

        const updated = user.updateInfo({
            name: 'New Name',
            avatar: 'new.png',
            roles: [UserRole.admin()],
            status: UserStatus.Inactive,
            updatedAt: now,
        });

        expect(updated).not.toBe(user);
        expect(updated.name).toBe('New Name');
        expect(updated.avatar).toBe('new.png');
        expect(updated.roles[0]?.getValue()).toBe('ADMIN');
        expect(updated.status).toBe(UserStatus.Inactive);
        expect(updated.updatedAt).toBe(now);
        expect(updated.createdAt).toBe(user.createdAt);
        expect(updated.email).toBe(user.email);
    });
});
