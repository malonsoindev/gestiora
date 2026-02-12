import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { PasswordHasher } from '../ports/password-hasher.js';
import type { UserRepository } from '../ports/user.repository.js';
import type { ChangeOwnPasswordRequest } from '../dto/change-own-password.request.js';
import type { PortError } from '../errors/port.error.js';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error.js';
import { InvalidPasswordError } from '../../domain/errors/invalid-password.error.js';
import { AuthInvalidCredentialsError } from '../../domain/errors/auth-invalid-credentials.error.js';
import { Password } from '../../domain/value-objects/password.value-object.js';
import { fail, ok, type Result } from '../../shared/result.js';

export type ChangeOwnPasswordDependencies = {
    userRepository: UserRepository;
    passwordHasher: PasswordHasher;
    auditLogger: AuditLogger;
    dateProvider: DateProvider;
};

export type ChangeOwnPasswordError =
    | UserNotFoundError
    | InvalidPasswordError
    | AuthInvalidCredentialsError
    | PortError;

export class ChangeOwnPasswordUseCase {
    constructor(private readonly dependencies: ChangeOwnPasswordDependencies) {}

    async execute(request: ChangeOwnPasswordRequest): Promise<Result<void, ChangeOwnPasswordError>> {
        const nowResult = this.dependencies.dateProvider.now();
        if (!nowResult.success) {
            return fail(nowResult.error);
        }
        const now = nowResult.value;

        const userResult = await this.dependencies.userRepository.findById(request.actorUserId);
        if (!userResult.success) {
            return fail(userResult.error);
        }
        const existingUser = userResult.value;
        if (!existingUser) {
            return fail(new UserNotFoundError());
        }

        const currentPasswordResult = await this.dependencies.passwordHasher.verify(
            request.currentPassword,
            existingUser.passwordHash,
        );
        if (!currentPasswordResult.success) {
            return fail(currentPasswordResult.error);
        }
        if (!currentPasswordResult.value) {
            return fail(new AuthInvalidCredentialsError());
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
            actorUserId: existingUser.id,
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
