import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { PasswordHasher } from '../ports/password-hasher.js';
import type { UserRepository } from '../ports/user.repository.js';
import type { ChangeUserPasswordRequest } from '../dto/change-user-password.request.js';
import type { PortError } from '../errors/port.error.js';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error.js';
import { InvalidPasswordError } from '../../domain/errors/invalid-password.error.js';
import { Password } from '../../domain/value-objects/password.value-object.js';
import { fail, ok, type Result } from '../../shared/result.js';

export type ChangeUserPasswordDependencies = {
    userRepository: UserRepository;
    passwordHasher: PasswordHasher;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
};

export type ChangeUserPasswordError = UserNotFoundError | InvalidPasswordError | PortError;

export class ChangeUserPasswordUseCase {
    constructor(private readonly dependencies: ChangeUserPasswordDependencies) {}

    async execute(request: ChangeUserPasswordRequest): Promise<Result<void, ChangeUserPasswordError>> {
        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const userResult = await this.dependencies.userRepository.findById(request.userId);
        if (!userResult.success) {
            return fail(userResult.error);
        }
        const existingUser = userResult.value;
        if (!existingUser) {
            return fail(new UserNotFoundError());
        }

        const passwordResult = this.buildPassword(request.newPassword);
        if (!passwordResult.success) {
            return fail(passwordResult.error);
        }

        const hashResult = await this.dependencies.passwordHasher.hash(passwordResult.value.getValue());
        if (!hashResult.success) {
            return fail(hashResult.error);
        }

        const updated = existingUser.updateInfo({
            passwordHash: hashResult.value,
            updatedAt: now,
        });

        const updateResult = await this.dependencies.userRepository.update(updated);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        const auditResult = await this.dependencies.auditLogger.log({
            action: 'USER_PASSWORD_CHANGED',
            actorUserId: request.actorUserId,
            targetUserId: existingUser.id,
            createdAt: now,
        });
        if (!auditResult.success) {
            return fail(auditResult.error);
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
