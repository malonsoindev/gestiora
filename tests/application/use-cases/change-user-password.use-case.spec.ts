import { describe, expect, it } from 'vitest';
import { ChangeUserPasswordUseCase } from '@application/use-cases/change-user-password.use-case.js';
import type { PasswordHasher } from '@application/ports/password-hasher.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import type { UserProps } from '@domain/entities/user.entity.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { InvalidPasswordError } from '@domain/errors/invalid-password.error.js';
import { UserNotFoundError } from '@domain/errors/user-not-found.error.js';
import { ok } from '@shared/result.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { UserRepositorySpy } from '@tests/shared/spies/user-repository.spy.js';
import { fixedNow } from '@tests/shared/fixed-now.js';
import { createTestUser } from '@tests/shared/fixtures/user.fixture.js';

const testCredentialHashValue = 'hash';
const validNewCredential = 'NewPassword1!a';
const invalidNewCredential = 'short';

const createUser = (overrides: Partial<UserProps> = {}): User =>
    createTestUser({
        now: fixedNow,
        overrides: {
            passwordHash: testCredentialHashValue,
            name: 'Test User',
            avatar: 'avatar.png',
            status: UserStatus.Active,
            roles: [UserRole.user()],
            ...overrides,
        },
    });

class PasswordHasherStub implements PasswordHasher {
    async hash(value: string) {
        return ok(`hashed:${value}`);
    }

    async verify(_plainText: string, _hash: string) {
        return ok(true);
    }
}

type SutOverrides = Partial<{
    user: User | null;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const user = overrides.user === undefined ? createUser() : overrides.user;
    const userRepository = new UserRepositorySpy(user);
    const auditLogger = new AuditLoggerSpy();
    const passwordHasher = new PasswordHasherStub();

    const useCase = new ChangeUserPasswordUseCase({
        userRepository,
        passwordHasher,
        auditLogger,
        dateProvider: new DateProviderStub(fixedNow),
    });

    return { useCase, userRepository, auditLogger };
};

describe('ChangeUserPasswordUseCase', () => {
    it('updates password hash and audits the action', async () => {
        const { useCase, userRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'admin-1',
            userId: 'user-1',
            newPassword: validNewCredential,
        });

        expect(result.success).toBe(true);
        expect(userRepository.updatedUser?.passwordHash).toBe(`hashed:${validNewCredential}`);
        expect(auditLogger.events.some((event) => event.action === 'USER_PASSWORD_CHANGED')).toBe(true);
    });

    it('rejects invalid password', async () => {
        const { useCase, userRepository } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'admin-1',
            userId: 'user-1',
            newPassword: invalidNewCredential,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidPasswordError);
        }
        expect(userRepository.updatedUser).toBeNull();
    });

    it('returns not found when user does not exist', async () => {
        const { useCase, userRepository } = makeSut({ user: null });

        const result = await useCase.execute({
            actorUserId: 'admin-1',
            userId: 'missing',
            newPassword: validNewCredential,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
        expect(userRepository.updatedUser).toBeNull();
    });
});
