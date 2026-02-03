import type { UpdateUserRequest } from '../dto/update-user.request.js';
import type { UserRepository } from '../ports/user.repository.js';
import type { PortError } from '../errors/port.error.js';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error.js';
import { InvalidUserRolesError } from '../../domain/errors/invalid-user-roles.error.js';
import { InvalidUserStatusError } from '../../domain/errors/invalid-user-status.error.js';
import { fail, ok, type Result } from '../../shared/result.js';
import { UserStatus } from '../../domain/entities/user.entity.js';

export type UpdateUserDependencies = {
    userRepository: UserRepository;
    now: () => Date;
};

export type UpdateUserError =
    | UserNotFoundError
    | InvalidUserRolesError
    | InvalidUserStatusError
    | PortError;

export class UpdateUserUseCase {
    constructor(private readonly dependencies: UpdateUserDependencies) {}

    async execute(request: UpdateUserRequest): Promise<Result<void, UpdateUserError>> {
        if (request.roles && request.roles.length === 0) {
            return fail(new InvalidUserRolesError());
        }

        if (request.status === UserStatus.Deleted) {
            return fail(new InvalidUserStatusError());
        }

        const userResult = await this.dependencies.userRepository.findById(request.userId);
        if (!userResult.success) {
            return fail(userResult.error);
        }

        const existingUser = userResult.value;
        if (!existingUser) {
            return fail(new UserNotFoundError());
        }

        const updatedUser = existingUser.updateInfo({
            ...(request.name !== undefined ? { name: request.name } : {}),
            ...(request.avatar !== undefined ? { avatar: request.avatar } : {}),
            ...(request.roles ? { roles: request.roles } : {}),
            ...(request.status ? { status: request.status } : {}),
            updatedAt: this.dependencies.now(),
        });

        const updateResult = await this.dependencies.userRepository.update(updatedUser);
        if (!updateResult.success) {
            return fail(updateResult.error);
        }

        return ok(undefined);
    }
}
