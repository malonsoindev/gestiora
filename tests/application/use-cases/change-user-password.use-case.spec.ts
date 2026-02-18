import { describe, expect, it } from 'vitest';
import { ChangeUserPasswordUseCase } from '@application/use-cases/change-user-password.use-case.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import type { UserProps } from '@domain/entities/user.entity.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { InvalidPasswordError } from '@domain/errors/invalid-password.error.js';
import { UserNotFoundError } from '@domain/errors/user-not-found.error.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { PasswordHasherStub } from '@tests/shared/stubs/password-hasher.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';
import { UserRepositorySpy } from '@tests/shared/spies/user-repository.spy.js';
import { fixedNow } from '@tests/shared/fixed-now.js';
import { createTestUser } from '@tests/shared/fixtures/user.fixture.js';

const validNewPassword = 'NewPassword1!a';
const invalidNewPassword = 'short';

const createUser = (overrides: Partial<UserProps> = {}): User =>
    createTestUser({
        now: fixedNow,
        overrides: {
            name: 'Test User',
            avatar: 'avatar.png',
            status: UserStatus.Active,
            roles: [UserRole.user()],
            ...overrides,
        },
    });

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
            newPassword: validNewPassword,
        });

        expect(result.success).toBe(true);
        expect(userRepository.updatedUser?.passwordHash).toBe(`hashed:${validNewPassword}`);
        expect(auditLogger.events.some((event) => event.action === 'USER_PASSWORD_CHANGED')).toBe(true);
    });

    it('rejects invalid password', async () => {
        const { useCase, userRepository } = makeSut();

        const result = await useCase.execute({
            actorUserId: 'admin-1',
            userId: 'user-1',
            newPassword: invalidNewPassword,
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
            newPassword: validNewPassword,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
        expect(userRepository.updatedUser).toBeNull();
    });
});
