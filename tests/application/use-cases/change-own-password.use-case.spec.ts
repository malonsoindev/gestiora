import { describe, expect, it } from 'vitest';
import { ChangeOwnPasswordUseCase } from '../../../src/application/use-cases/change-own-password.use-case.js';
import type { PasswordHasher } from '../../../src/application/ports/password-hasher.js';
import { User, UserStatus } from '../../../src/domain/entities/user.entity.js';
import type { UserProps } from '../../../src/domain/entities/user.entity.js';
import { UserRole } from '../../../src/domain/value-objects/user-role.value-object.js';
import { Email } from '../../../src/domain/value-objects/email.value-object.js';
import { InvalidPasswordError } from '../../../src/domain/errors/invalid-password.error.js';
import { UserNotFoundError } from '../../../src/domain/errors/user-not-found.error.js';
import { AuthInvalidCredentialsError } from '../../../src/domain/errors/auth-invalid-credentials.error.js';
import { ok } from '../../../src/shared/result.js';
import { DateProviderStub } from '../../shared/stubs/date-provider.stub.js';
import { AuditLoggerSpy } from '../../shared/spies/audit-logger.spy.js';
import { UserRepositorySpy } from '../../shared/spies/user-repository.spy.js';
import { fixedNow } from '../../shared/fixed-now.js';

const testPasswordHash = 'hash';

const createUser = (overrides: Partial<UserProps> = {}): User =>
    User.create({
        id: 'user-1',
        email: Email.create('user@example.com'),
        passwordHash: testPasswordHash,
        name: 'Test User',
        avatar: 'avatar.png',
        status: UserStatus.Active,
        roles: [UserRole.user()],
        createdAt: fixedNow,
        updatedAt: fixedNow,
        ...overrides,
    });

const validCurrentPassword = 'Current1!a';
const validNewPassword = 'NewPassword1!a';
const invalidNewPassword = 'short';
const invalidCurrentPassword = 'WrongPass1!a';

class PasswordHasherStub implements PasswordHasher {
    constructor(private readonly isValid: boolean) {}

    async hash(value: string) {
        return ok(`hashed:${value}`);
    }

    async verify(_plainText: string, _hash: string) {
        return ok(this.isValid);
    }
}

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
            currentPassword: validCurrentPassword,
            newPassword: validNewPassword,
        });

        expect(result.success).toBe(true);
        expect(userRepository.updatedUser?.passwordHash).toBe(`hashed:${validNewPassword}`);
        expect(auditLogger.events.some((event) => event.action === 'USER_PASSWORD_CHANGED')).toBe(true);
    });

    it('rejects invalid current password', async () => {
        const { useCase, userRepository } = makeSut({ passwordValid: false });

        const result = await useCase.execute({
            actorUserId: 'user-1',
            currentPassword: invalidCurrentPassword,
            newPassword: validNewPassword,
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
            currentPassword: validCurrentPassword,
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
            actorUserId: 'missing-user',
            currentPassword: validCurrentPassword,
            newPassword: validNewPassword,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
        expect(userRepository.updatedUser).toBeNull();
    });
});
