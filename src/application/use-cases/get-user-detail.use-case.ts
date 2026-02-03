import type { GetUserDetailRequest } from '../dto/get-user-detail.request.js';
import type { GetUserDetailResponse } from '../dto/get-user-detail.response.js';
import type { UserRepository } from '../ports/user.repository.js';
import type { PortError } from '../errors/port.error.js';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error.js';
import { fail, ok, type Result } from '../../shared/result.js';

export type GetUserDetailDependencies = {
    userRepository: UserRepository;
};

export type GetUserDetailError = UserNotFoundError | PortError;

export class GetUserDetailUseCase {
    constructor(private readonly dependencies: GetUserDetailDependencies) {}

    async execute(
        request: GetUserDetailRequest,
    ): Promise<Result<GetUserDetailResponse, GetUserDetailError>> {
        const result = await this.dependencies.userRepository.findById(request.userId);
        if (!result.success) {
            return fail(result.error);
        }

        if (!result.value) {
            return fail(new UserNotFoundError());
        }

        const user = result.value;

        return ok({
            userId: user.id,
            email: user.email,
            ...(user.name ? { name: user.name } : {}),
            ...(user.avatar ? { avatar: user.avatar } : {}),
            status: user.status,
            roles: user.roles,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            ...(user.deletedAt ? { deletedAt: user.deletedAt } : {}),
        });
    }
}
