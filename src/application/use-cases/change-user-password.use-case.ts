import type { AuditLogger } from '../ports/audit-logger.js';
import type { DateProvider } from '../ports/date-provider.js';
import type { PasswordHasher } from '../ports/password-hasher.js';
import type { UserRepository } from '../ports/user.repository.js';
import type { ChangeUserPasswordRequest } from '../dto/change-user-password.request.js';
import type { PortError } from '../errors/port.error.js';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error.js';
import { InvalidPasswordError } from '../../domain/errors/invalid-password.error.js';
import { fail, type Result } from '../../shared/result.js';
import { applyPasswordChange } from '../shared/apply-password-change.js';

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

        return applyPasswordChange({
            user: existingUser,
            actorUserId: request.actorUserId,
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
