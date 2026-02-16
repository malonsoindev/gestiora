import { describe, expect, it } from 'vitest';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case.js';
import type { PasswordHasher } from '@application/ports/password-hasher.js';
import type { IdGenerator } from '@application/ports/id-generator.js';
import { InvalidPasswordError } from '@domain/errors/invalid-password.error.js';
import { InvalidUserRolesError } from '@domain/errors/invalid-user-roles.error.js';
import { InvalidUserStatusError } from '@domain/errors/invalid-user-status.error.js';
import { UserAlreadyExistsError } from '@domain/errors/user-already-exists.error.js';
import { InvalidEmailError } from '@domain/errors/invalid-email.error.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { Email } from '@domain/value-objects/email.value-object.js';
import { createTestUser } from '@tests/shared/fixtures/user.fixture.js';
import { UserRepositorySpy } from '@tests/shared/spies/user-repository.spy.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';
import { PasswordHasherStub } from '@tests/shared/stubs/password-hasher.stub.js';
import { AuditLoggerSpy } from '@tests/shared/spies/audit-logger.spy.js';

const fixedNow = new Date('2026-02-02T10:00:00.000Z');

const validNewCredential = 'StrongPass1!a';
const invalidNewCredential = 'weak';

const createUserEntity = (): User =>
    createTestUser({
        now: fixedNow,
        overrides: {
            email: Email.create('existing@example.com'),
        },
    });

class UserIdGeneratorStub implements IdGenerator {
    constructor(private readonly id: string) {}

    generate(): string {
        return this.id;
    }
}

type SutOverrides = Partial<{
    existingUser: User | null;
    passwordHasher: PasswordHasher;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const userRepository = new UserRepositorySpy(overrides.existingUser ?? null);
    const auditLogger = new AuditLoggerSpy();
    const userIdGenerator = new UserIdGeneratorStub('user-fixed');

    const useCase = new CreateUserUseCase({
        userRepository,
        passwordHasher: overrides.passwordHasher ?? new PasswordHasherStub(),
        auditLogger,
        dateProvider: new DateProviderStub(fixedNow),
        userIdGenerator,
    });

    return { useCase, userRepository, auditLogger };
};

const baseRequest = {
    actorUserId: 'admin-1',
    email: 'new@example.com',
    password: validNewCredential,
    roles: [UserRole.user()],
};


describe('CreateUserUseCase', () => {
    it('creates a user and audits the action', async () => {
        const { useCase, userRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            ...baseRequest,
            name: 'New User',
            avatar: 'avatar.png',
        });

        expect(result.success).toBe(true);
        expect(userRepository.createdUser).not.toBeNull();
        expect(userRepository.createdUser?.id).toBe('user-fixed');
        expect(userRepository.createdUser?.email).toBe('new@example.com');
        expect(userRepository.createdUser?.passwordHash).toBe(`hashed:${validNewCredential}`);
        expect(userRepository.createdUser?.status).toBe(UserStatus.Active);
        expect(userRepository.createdUser?.roles[0]?.getValue()).toBe('USER');
        expect(userRepository.createdUser?.createdAt).toBe(fixedNow);
        expect(userRepository.createdUser?.updatedAt).toBe(fixedNow);
        expect(auditLogger.events.some((event) => event.action === 'USER_CREATED')).toBe(true);
    });

    it('rejects when user already exists', async () => {
        const { useCase, userRepository, auditLogger } = makeSut({
            existingUser: createUserEntity(),
        });

        const result = await useCase.execute({
            ...baseRequest,
            email: 'existing@example.com',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserAlreadyExistsError);
        }
        expect(userRepository.createdUser).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects invalid passwords', async () => {
        const { useCase, userRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            ...baseRequest,
            password: invalidNewCredential,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidPasswordError);
        }
        expect(userRepository.createdUser).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects invalid emails', async () => {
        const { useCase, userRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            ...baseRequest,
            email: 'not-an-email',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidEmailError);
        }
        expect(userRepository.createdUser).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects when roles are empty', async () => {
        const { useCase, userRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            ...baseRequest,
            roles: [],
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidUserRolesError);
        }
        expect(userRepository.createdUser).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects deleted status on creation', async () => {
        const { useCase, userRepository, auditLogger } = makeSut();

        const result = await useCase.execute({
            ...baseRequest,
            status: UserStatus.Deleted,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidUserStatusError);
        }
        expect(userRepository.createdUser).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });
});
