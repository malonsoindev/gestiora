import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { PasswordHasher } from '@application/ports/password-hasher.js';
import type { UserIdGenerator } from '@application/ports/user-id-generator.js';
import type { UserRepository } from '@application/ports/user.repository.js';
import type { CreateUserRequest } from '@application/dto/create-user.request.js';
import type { CreateUserResponse } from '@application/dto/create-user.response.js';
import type { PortError } from '@application/errors/port.error.js';
import { User, UserStatus } from '@domain/entities/user.entity.js';
import type { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { InvalidEmailError } from '@domain/errors/invalid-email.error.js';
import { InvalidPasswordError } from '@domain/errors/invalid-password.error.js';
import { InvalidUserRolesError } from '@domain/errors/invalid-user-roles.error.js';
import { InvalidUserStatusError } from '@domain/errors/invalid-user-status.error.js';
import { UserAlreadyExistsError } from '@domain/errors/user-already-exists.error.js';
import { Email } from '@domain/value-objects/email.value-object.js';
import { Password } from '@domain/value-objects/password.value-object.js';
import { fail, ok, type Result } from '@shared/result.js';

export type CreateUserDependencies = {
    userRepository: UserRepository;
    passwordHasher: PasswordHasher;
    userIdGenerator: UserIdGenerator;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
};

export type CreateUserError =
    | UserAlreadyExistsError
    | InvalidEmailError
    | InvalidPasswordError
    | InvalidUserRolesError
    | InvalidUserStatusError
    | PortError;

export class CreateUserUseCase {
    constructor(private readonly dependencies: CreateUserDependencies) {}

    async execute(request: CreateUserRequest): Promise<Result<CreateUserResponse, CreateUserError>> {
        const rolesResult = this.validateRoles(request.roles);
        if (!rolesResult.success) {
            return fail(rolesResult.error);
        }

        const statusResult = this.validateStatus(request.status ?? UserStatus.Active);
        if (!statusResult.success) {
            return fail(statusResult.error);
        }
        const status = statusResult.value;

        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const emailResult = this.buildEmail(request.email);
        if (!emailResult.success) {
            return fail(emailResult.error);
        }
        const email = emailResult.value;

        const uniquenessResult = await this.ensureUserNotExists(email);
        if (!uniquenessResult.success) {
            return fail(uniquenessResult.error);
        }

        const passwordResult = this.buildPassword(request.password);
        if (!passwordResult.success) {
            return fail(passwordResult.error);
        }
        const password = passwordResult.value;

        const hashResult = await this.dependencies.passwordHasher.hash(password.getValue());
        if (!hashResult.success) {
            return fail(hashResult.error);
        }

        const user = User.create({
            id: this.dependencies.userIdGenerator.generate(),
            email,
            passwordHash: hashResult.value,
            ...(request.name ? { name: request.name } : {}),
            ...(request.avatar ? { avatar: request.avatar } : {}),
            status,
            roles: request.roles,
            createdAt: now,
            updatedAt: now,
        });

        const createResult = await this.dependencies.userRepository.create(user);
        if (!createResult.success) {
            return fail(createResult.error);
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'USER_CREATED',
            actorUserId: request.actorUserId,
            targetUserId: user.id,
            metadata: { email: user.email },
            createdAt: now,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
        }

        return ok({ userId: user.id });
    }

    private validateRoles(roles: UserRole[]): Result<UserRole[], InvalidUserRolesError> {
        if (roles.length === 0) {
            return fail(new InvalidUserRolesError());
        }
        return ok(roles);
    }

    private validateStatus(status: UserStatus): Result<UserStatus, InvalidUserStatusError> {
        if (status === UserStatus.Deleted) {
            return fail(new InvalidUserStatusError());
        }
        return ok(status);
    }

    private buildEmail(email: string): Result<Email, InvalidEmailError> {
        try {
            return ok(Email.create(email));
        } catch (error) {
            if (error instanceof InvalidEmailError) {
                return fail(error);
            }
            throw error;
        }
    }

    private async ensureUserNotExists(
        email: Email,
    ): Promise<Result<void, UserAlreadyExistsError | PortError>> {
        const existingResult = await this.dependencies.userRepository.findByEmail(email.getValue());
        if (!existingResult.success) {
            return fail(existingResult.error);
        }
        if (existingResult.value) {
            return fail(new UserAlreadyExistsError());
        }
        return ok(undefined);
    }

    private buildPassword(password: string): Result<Password, InvalidPasswordError> {
        try {
            return ok(Password.create(password));
        } catch (error) {
            if (error instanceof InvalidPasswordError) {
                return fail(error);
            }
            throw error;
        }
    }
}
