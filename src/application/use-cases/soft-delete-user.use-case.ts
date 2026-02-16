import type { SoftDeleteUserRequest } from '@application/dto/soft-delete-user.request.js';
import type { UserRepository } from '@application/ports/user.repository.js';
import type { SessionRepository } from '@application/ports/session.repository.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { PortError } from '@application/errors/port.error.js';
import { UserNotFoundError } from '@domain/errors/user-not-found.error.js';
import { SelfDeletionNotAllowedError } from '@domain/errors/self-deletion-not-allowed.error.js';
import { UserStatus } from '@domain/entities/user.entity.js';
import { fail, ok, type Result } from '@shared/result.js';

export type SoftDeleteUserDependencies = {
    userRepository: UserRepository;
    sessionRepository: SessionRepository;
    dateProvider: DateProvider;
};

export type SoftDeleteUserError = UserNotFoundError | SelfDeletionNotAllowedError | PortError;

export class SoftDeleteUserUseCase {
    constructor(private readonly dependencies: SoftDeleteUserDependencies) {}

    async execute(request: SoftDeleteUserRequest): Promise<Result<void, SoftDeleteUserError>> {
        if (request.userId === request.actorUserId) {
            return fail(new SelfDeletionNotAllowedError());
        }

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

        const softDeleted = existingUser.updateInfo({
            status: UserStatus.Deleted,
            deletedAt: now,
            updatedAt: now,
        });

        const updateResult = await this.dependencies.userRepository.update(softDeleted);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        const revokeResult = await this.dependencies.sessionRepository.revokeByUserId(request.userId);
        if (!revokeResult.success) {
            return fail(revokeResult.error);
        }

        return ok(undefined);
    }
}
