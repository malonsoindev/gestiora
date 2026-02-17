import type { UpdateUserStatusRequest } from '@application/dto/update-user-status.request.js';
import type { UserRepository } from '@application/ports/user.repository.js';
import type { DateProvider } from '@application/ports/date-provider.js';
import type { PortError } from '@application/errors/port.error.js';
import { UserNotFoundError } from '@domain/errors/user-not-found.error.js';
import { InvalidUserStatusError } from '@domain/errors/invalid-user-status.error.js';
import { UserStatus } from '@domain/entities/user.entity.js';
import { fail, ok, type Result } from '@shared/result.js';

export type UpdateUserStatusDependencies = {
    userRepository: UserRepository;
    dateProvider: DateProvider;
};

export type UpdateUserStatusError = UserNotFoundError | InvalidUserStatusError | PortError;

export class UpdateUserStatusUseCase {
    constructor(private readonly dependencies: UpdateUserStatusDependencies) {}

    async execute(
        request: UpdateUserStatusRequest,
    ): Promise<Result<void, UpdateUserStatusError>> {
        if (request.status === UserStatus.Deleted) {
            return fail(new InvalidUserStatusError());
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

        const updatedUser = existingUser.updateInfo({
            status: request.status,
            updatedAt: now,
        });

        const updateResult = await this.dependencies.userRepository.update(updatedUser);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        return ok(undefined);
    }
}
