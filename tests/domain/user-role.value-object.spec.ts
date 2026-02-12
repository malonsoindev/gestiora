import { describe, expect, it } from 'vitest';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';

describe('UserRole', () => {
    it('creates a user role value object', () => {
        const role = UserRole.user();

        expect(role.getValue()).toBe('USER');
    });

    it('creates an admin role value object', () => {
        const role = UserRole.admin();

        expect(role.getValue()).toBe('ADMIN');
    });

    it('compares roles by value', () => {
        const roleA = UserRole.user();
        const roleB = UserRole.create('USER');
        const roleC = UserRole.admin();

        expect(roleA.equals(roleB)).toBe(true);
        expect(roleA.equals(roleC)).toBe(false);
    });
});
