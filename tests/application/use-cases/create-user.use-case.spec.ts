import { describe, expect, it } from 'vitest';
import { CreateUserUseCase } from '@application/use-cases/create-user.use-case.js';
import type { PasswordHasher } from '@application/ports/password-hasher.js';
import type { IdGenerator } from '@application/ports/id-generator.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { AuditLogger, AuditEvent } from '@application/ports/audit-logger.js';
import type { UserRepository } from '@application/ports/user.repository.js';
import { PortError } from '@application/errors/port.error.js';
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
import { fail, ok, type Result } from '@shared/result.js';

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

// --- Failing Stubs for PortError tests ---

class FailingDateProvider implements DateProvider {
    now(): Result<Date, PortError> {
        return fail(new PortError('DateProvider', 'Clock sync error'));
    }
}

class FailingAuditLogger implements AuditLogger {
    async log(_event: AuditEvent): Promise<Result<void, PortError>> {
        return fail(new PortError('AuditLogger', 'Audit service unavailable'));
    }
}

class FailingUserRepository implements UserRepository {
    constructor(private readonly failOn: 'findByEmail' | 'create') {}

    async findByEmail(_email: string): Promise<Result<User | null, PortError>> {
        if (this.failOn === 'findByEmail') {
            return fail(new PortError('UserRepository', 'Database read error'));
        }
        return ok(null);
    }

    async findById(_id: string): Promise<Result<User | null, PortError>> {
        return ok(null);
    }

    async create(_user: User): Promise<Result<void, PortError>> {
        if (this.failOn === 'create') {
            return fail(new PortError('UserRepository', 'Database write error'));
        }
        return ok(undefined);
    }

    async list(_filter: { status?: UserStatus; role?: UserRole; page: number; pageSize: number }): Promise<Result<{ items: User[]; total: number }, PortError>> {
        return ok({ items: [], total: 0 });
    }

    async update(_user: User): Promise<Result<void, PortError>> {
        return ok(undefined);
    }
}

class FailingPasswordHasher implements PasswordHasher {
    async hash(_plainText: string): Promise<Result<string, PortError>> {
        return fail(new PortError('PasswordHasher', 'Hash service unavailable'));
    }

    async verify(_plainText: string, _hash: string): Promise<Result<boolean, PortError>> {
        return ok(true);
    }
}

type SutOverrides = Partial<{
    existingUser: User | null;
    passwordHasher: PasswordHasher;
    dateProvider: DateProvider;
    auditLogger: AuditLogger;
    userRepository: UserRepository;
}>;

const makeSut = (overrides: SutOverrides = {}) => {
    const userRepository = overrides.userRepository ?? new UserRepositorySpy(overrides.existingUser ?? null);
    const auditLogger = overrides.auditLogger ?? new AuditLoggerSpy();
    const userIdGenerator = new UserIdGeneratorStub('user-fixed');
    const dateProvider = overrides.dateProvider ?? new DateProviderStub(fixedNow);

    const useCase = new CreateUserUseCase({
        userRepository,
        passwordHasher: overrides.passwordHasher ?? new PasswordHasherStub(),
        auditLogger,
        dateProvider,
        userIdGenerator,
    });

    return { useCase };
};

const makeSutWithSpies = (overrides: Omit<SutOverrides, 'dateProvider' | 'auditLogger' | 'userRepository'> = {}) => {
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
        const { useCase, userRepository, auditLogger } = makeSutWithSpies();

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
        const { useCase, userRepository, auditLogger } = makeSutWithSpies({
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
        const { useCase, userRepository, auditLogger } = makeSutWithSpies();

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
        const { useCase, userRepository, auditLogger } = makeSutWithSpies();

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
        const { useCase, userRepository, auditLogger } = makeSutWithSpies();

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
        const { useCase, userRepository, auditLogger } = makeSutWithSpies();

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

    describe('PortError propagation', () => {
        it('propagates PortError when DateProvider.now fails', async () => {
            const { useCase } = makeSut({ dateProvider: new FailingDateProvider() });

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('DateProvider');
            }
        });

        it('propagates PortError when UserRepository.findByEmail fails', async () => {
            const { useCase } = makeSut({
                userRepository: new FailingUserRepository('findByEmail'),
            });

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('UserRepository');
            }
        });

        it('propagates PortError when PasswordHasher.hash fails', async () => {
            const { useCase } = makeSut({
                passwordHasher: new FailingPasswordHasher(),
            });

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('PasswordHasher');
            }
        });

        it('propagates PortError when UserRepository.create fails', async () => {
            const { useCase } = makeSut({
                userRepository: new FailingUserRepository('create'),
            });

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('UserRepository');
            }
        });

        it('propagates PortError when AuditLogger.log fails', async () => {
            const { useCase } = makeSut({
                auditLogger: new FailingAuditLogger(),
            });

            const result = await useCase.execute(baseRequest);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toBeInstanceOf(PortError);
                expect((result.error as PortError).port).toBe('AuditLogger');
            }
        });
    });
});
