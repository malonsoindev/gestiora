import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { PasswordHasher } from '../ports/password-hasher.js';
import type { UserRepository } from '../ports/user.repository.js';
import type { CreateUserRequest } from '../dto/create-user.request.js';
import type { CreateUserResponse } from '../dto/create-user.response.js';
import type { PortError } from '../errors/port.error.js';
import { User, UserStatus } from '../../domain/entities/user.entity.js';
import { InvalidEmailError } from '../../domain/errors/invalid-email.error.js';
import { InvalidPasswordError } from '../../domain/errors/invalid-password.error.js';
import { InvalidUserRolesError } from '../../domain/errors/invalid-user-roles.error.js';
import { InvalidUserStatusError } from '../../domain/errors/invalid-user-status.error.js';
import { UserAlreadyExistsError } from '../../domain/errors/user-already-exists.error.js';
import { Email } from '../../domain/value-objects/email.value-object.js';
import { Password } from '../../domain/value-objects/password.value-object.js';
import { fail, ok, type Result } from '../../shared/result.js';

export type CreateUserDependencies = {
    userRepository: UserRepository;
    passwordHasher: PasswordHasher;
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
        if (request.roles.length === 0) {
            return fail(new InvalidUserRolesError());
        }

        const status = request.status ?? UserStatus.Active;
        if (status === UserStatus.Deleted) {
            return fail(new InvalidUserStatusError());
        }

        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        let email: Email;
        try {
            email = Email.create(request.email);
        } catch (error) {
            if (error instanceof InvalidEmailError) {
                return fail(error);
            }
            throw error;
        }

        const existingResult = await this.dependencies.userRepository.findByEmail(email.getValue());
        if (!existingResult.success) {
            return fail(existingResult.error);
        }
        if (existingResult.value) {
            return fail(new UserAlreadyExistsError());
        }

        let password: Password;
        try {
            password = Password.create(request.password);
        } catch (error) {
            if (error instanceof InvalidPasswordError) {
                return fail(error);
            }
            throw error;
        }

        const hashResult = await this.dependencies.passwordHasher.hash(password.getValue());
        if (!hashResult.success) {
            return fail(hashResult.error);
        }

        const user = User.create({
            id: generateUserId(now),
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
}

const generateUserId = (date: Date): string => {
    const randomPart = Math.floor(Math.random() * 1_000_000_000).toString(36);
    return `user-${date.getTime()}-${randomPart}`;
};
