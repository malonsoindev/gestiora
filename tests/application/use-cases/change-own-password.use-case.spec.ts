import { describe, expect, it } from 'vitest';
import { ChangeOwnPasswordUseCase } from '@application/use-cases/change-own-password.use-case.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import type { UserProps } from '@domain/entities/user.entity.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { InvalidPasswordError } from '@domain/errors/invalid-password.error.js';
import { UserNotFoundError } from '@domain/errors/user-not-found.error.js';
import { AuthInvalidCredentialsError } from '@domain/errors/auth-invalid-credentials.error.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { PasswordHasherStub } from '@tests/shared/stubs/password-hasher.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { UserRepositorySpy } from '@tests/shared/spies/user-repository.spy.js';
import { fixedNow } from '@tests/shared/fixed-now.js';
import { createTestUser } from '@tests/shared/fixtures/user.fixture.js';

const testCredentialHashValue = 'hash';

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

const validCurrentCredential = 'Current1!a';
const validNewCredential = 'NewPassword1!a';
const invalidNewCredential = 'short';
const invalidCurrentCredential = 'WrongPass1!a';

type SutOverrides = Partial<{
    user: User | null;
    passwordValid: boolean;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const user = overrides.user === undefined ? createUser() : overrides.user;
    const userRepository = new UserRepositorySpy(user);
    const auditLogger = new AuditLoggerSpy();
    const passwordHasher = new PasswordHasherStub(overrides.passwordValid ?? true);

    const useCase = new ChangeOwnPasswordUseCase({
        userRepository,
        passwordHasher,
        auditLogger,
        dateProvider: new DateProviderStub(fixedNow),
    });

    return { useCase, userRepository, auditLogger };
};

describe('ChangeOwnPasswordUseCase', () => {
    it('updates password hash and audits the action', async () => {
        const { useCase, userRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'user-1',
            currentPassword: validCurrentCredential,
            newPassword: validNewCredential,
        });

        expect(result.success).toBe(true);
        expect(userRepository.updatedUser?.passwordHash).toBe(`hashed:${validNewCredential}`);
        expect(auditLogger.events.some((event) => event.action === 'USER_PASSWORD_CHANGED')).toBe(true);
    });

    it('rejects invalid current password', async () => {
        const { useCase, userRepository } = makeSut({ passwordValid: false });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            currentPassword: invalidCurrentCredential,
            newPassword: validNewCredential,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AuthInvalidCredentialsError);
        }
        expect(userRepository.updatedUser).toBeNull();
    });

    it('rejects invalid new password', async () => {
        const { useCase, userRepository } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'user-1',
            currentPassword: validCurrentCredential,
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
            actorUserId: 'missing-user',
            currentPassword: validCurrentCredential,
            newPassword: validNewCredential,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
        expect(userRepository.updatedUser).toBeNull();
    });
});
