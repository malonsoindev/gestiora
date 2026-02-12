import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { PasswordHasher } from '../ports/password-hasher.js';
import type { UserRepository } from '../ports/user.repository.js';
import type { ChangeOwnPasswordRequest } from '../dto/change-own-password.request.js';
import type { PortError } from '../errors/port.error.js';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error.js';
import { InvalidPasswordError } from '../../domain/errors/invalid-password.error.js';
import { AuthInvalidCredentialsError } from '../../domain/errors/auth-invalid-credentials.error.js';
import { fail, type Result } from '../../shared/result.js';
import { applyPasswordChange } from '../shared/apply-password-change.js';

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

        return applyPasswordChange({
            user: existingUser,
            actorUserId: existingUser.id,
            newPassword: request.newPassword,
            now,
            dependencies: {
                userRepository: this.dependencies.userRepository,
                passwordHasher: this.dependencies.passwordHasher,
                auditLogger: this.dependencies.auditLogger,
            },
        });
    }
}
