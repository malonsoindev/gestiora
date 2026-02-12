import { describe, expect, it } from 'vitest';
import { CreateUserUseCase } from '../../../src/application/use-cases/create-user.use-case.js';
import type { AuditEvent, AuditLogger } from '../../../src/application/ports/audit-logger.js';
import type { DateProvider } from '../../../src/application/ports/date-provider.js';
import type { PasswordHasher } from '../../../src/application/ports/password-hasher.js';
import type { UserIdGenerator } from '../../../src/application/ports/user-id-generator.js';
import type { UserRepository } from '../../../src/application/ports/user.repository.js';
import { InvalidPasswordError } from '../../../src/domain/errors/invalid-password.error.js';
import { InvalidUserRolesError } from '../../../src/domain/errors/invalid-user-roles.error.js';
import { InvalidUserStatusError } from '../../../src/domain/errors/invalid-user-status.error.js';
import { UserAlreadyExistsError } from '../../../src/domain/errors/user-already-exists.error.js';
import { InvalidEmailError } from '../../../src/domain/errors/invalid-email.error.js';
import { User, UserStatus } from '../../../src/domain/entities/user.entity.js';
import { UserRole } from '../../../src/domain/value-objects/user-role.value-object.js';
import { Email } from '../../../src/domain/value-objects/email.value-object.js';
import { ok, type Result } from '../../../src/shared/result.js';
import type { PortError } from '../../../src/application/errors/port.error.js';

const fixedNow = new Date('2026-02-02T10:00:00.000Z');

const testCredentialHashValue = 'hash';
const validNewCredential = 'StrongPass1!a';
const invalidNewCredential = 'weak';

const createUserEntity = (): User =>
    User.create({
        id: 'user-1',
        email: Email.create('existing@example.com'),
        passwordHash: testCredentialHashValue,
        status: UserStatus.Active,
        roles: [UserRole.user()],
        createdAt: fixedNow,
        updatedAt: fixedNow,
    });

class DateProviderStub implements DateProvider {
    now(): Result<Date, PortError> {
        return ok(fixedNow);
    }
}

class AuditLoggerSpy implements AuditLogger {
    events: AuditEvent[] = [];

    async log(event: AuditEvent) {
        this.events.push(event);
        return ok(undefined);
    }
}

class UserIdGeneratorStub implements UserIdGenerator {
    constructor(private readonly id: string) {}

    generate(): string {
        return this.id;
    }
}

class PasswordHasherStub implements PasswordHasher {
    async verify() {
        return ok(false);
    }

    async hash(value: string) {
        return ok(`hashed:${value}`);
    }
}

class UserRepositorySpy implements UserRepository {
    createdUser: User | null = null;
    private readonly existingUser: User | null;

    constructor(existingUser: User | null = null) {
        this.existingUser = existingUser;
    }

    async findByEmail() {
        return ok(this.existingUser);
    }

    async findById() {
        return ok(this.existingUser);
    }

    async create(user: User) {
        this.createdUser = user;
        return ok(undefined);
    }

    async list() {
        return ok({ items: [], total: 0 });
    }

    async update() {
        return ok(undefined);
    }
}

describe('CreateUserUseCase', () => {
    it('creates a user and audits the action', async () => {
        const userRepository = new UserRepositorySpy();
        const auditLogger = new AuditLoggerSpy();
        const userIdGenerator = new UserIdGeneratorStub('user-fixed');

        const useCase = new CreateUserUseCase({
            userRepository,
            passwordHasher: new PasswordHasherStub(),
            auditLogger,
            dateProvider: new DateProviderStub(),
            userIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'admin-1',
            email: 'new@example.com',
            password: validNewCredential,
            roles: [UserRole.user()],
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
        const userRepository = new UserRepositorySpy(createUserEntity());
        const auditLogger = new AuditLoggerSpy();
        const userIdGenerator = new UserIdGeneratorStub('user-fixed');

        const useCase = new CreateUserUseCase({
            userRepository,
            passwordHasher: new PasswordHasherStub(),
            auditLogger,
            dateProvider: new DateProviderStub(),
            userIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'admin-1',
            email: 'existing@example.com',
            password: validNewCredential,
            roles: [UserRole.user()],
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserAlreadyExistsError);
        }
        expect(userRepository.createdUser).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects invalid passwords', async () => {
        const userRepository = new UserRepositorySpy();
        const auditLogger = new AuditLoggerSpy();
        const userIdGenerator = new UserIdGeneratorStub('user-fixed');

        const useCase = new CreateUserUseCase({
            userRepository,
            passwordHasher: new PasswordHasherStub(),
            auditLogger,
            dateProvider: new DateProviderStub(),
            userIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'admin-1',
            email: 'new@example.com',
            password: invalidNewCredential,
            roles: [UserRole.user()],
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidPasswordError);
        }
        expect(userRepository.createdUser).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects invalid emails', async () => {
        const userRepository = new UserRepositorySpy();
        const auditLogger = new AuditLoggerSpy();
        const userIdGenerator = new UserIdGeneratorStub('user-fixed');

        const useCase = new CreateUserUseCase({
            userRepository,
            passwordHasher: new PasswordHasherStub(),
            auditLogger,
            dateProvider: new DateProviderStub(),
            userIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'admin-1',
            email: 'not-an-email',
            password: validNewCredential,
            roles: [UserRole.user()],
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidEmailError);
        }
        expect(userRepository.createdUser).toBeNull();
        expect(auditLogger.events).toHaveLength(0);
    });

    it('rejects when roles are empty', async () => {
        const userRepository = new UserRepositorySpy();
        const auditLogger = new AuditLoggerSpy();
        const userIdGenerator = new UserIdGeneratorStub('user-fixed');

        const useCase = new CreateUserUseCase({
            userRepository,
            passwordHasher: new PasswordHasherStub(),
            auditLogger,
            dateProvider: new DateProviderStub(),
            userIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'admin-1',
            email: 'new@example.com',
            password: validNewCredential,
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
        const userRepository = new UserRepositorySpy();
        const auditLogger = new AuditLoggerSpy();
        const userIdGenerator = new UserIdGeneratorStub('user-fixed');

        const useCase = new CreateUserUseCase({
            userRepository,
            passwordHasher: new PasswordHasherStub(),
            auditLogger,
            dateProvider: new DateProviderStub(),
            userIdGenerator,
        });

        const result = await useCase.execute({
            actorUserId: 'admin-1',
            email: 'new@example.com',
            password: validNewCredential,
            roles: [UserRole.user()],
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
