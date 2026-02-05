import type { UpdateOwnProfileRequest } from '../dto/update-own-profile.request.js';
import type { UserRepository } from '../ports/user.repository.js';
import type { PortError } from '../errors/port.error.js';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error.js';
import { fail, ok, type Result } from '../../shared/result.js';

export type UpdateOwnProfileDependencies = {
    userRepository: UserRepository;
    now: () => Date;
};

export type UpdateOwnProfileError = UserNotFoundError | PortError;

export class UpdateOwnProfileUseCase {
    constructor(private readonly dependencies: UpdateOwnProfileDependencies) {}

    async execute(
        request: UpdateOwnProfileRequest,
    ): Promise<Result<void, UpdateOwnProfileError>> {
        const userResult = await this.dependencies.userRepository.findById(request.actorUserId);
        if (!userResult.success) {
            return fail(userResult.error);
        }

        const existingUser = userResult.value;
        if (!existingUser) {
            return fail(new UserNotFoundError());
        }

        const updated = existingUser.updateInfo({
            ...(request.name === undefined ? {} : { name: request.name }),
            ...(request.avatar === undefined ? {} : { avatar: request.avatar }),
            updatedAt: this.dependencies.now(),
        });

        const updateResult = await this.dependencies.userRepository.update(updated);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        return ok(undefined);
    }
}
