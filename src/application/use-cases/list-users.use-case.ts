import type { ListUsersRequest } from '../dto/list-users.request.js';
import type { ListUsersResponse, UserSummary } from '../dto/list-users.response.js';
import type { UserRepository } from '../ports/user.repository.js';
import type { PortError } from '../errors/port.error.js';
import { ok, type Result } from '../../shared/result.js';

export type ListUsersDependencies = {
    userRepository: UserRepository;
};

export class ListUsersUseCase {
    constructor(private readonly dependencies: ListUsersDependencies) {}

    async execute(request: ListUsersRequest): Promise<Result<ListUsersResponse, PortError>> {
        const result = await this.dependencies.userRepository.list({
            page: request.page,
            pageSize: request.pageSize,
            ...(request.status ? { status: request.status } : {}),
            ...(request.role ? { role: request.role } : {}),
        });

        if (!result.success) {
            return result;
        }

        const items = result.value.items.map((user): UserSummary => ({
            userId: user.id,
            email: user.email,
            ...(user.name ? { name: user.name } : {}),
            ...(user.avatar ? { avatar: user.avatar } : {}),
            status: user.status,
            roles: user.roles,
            createdAt: user.createdAt,
        }));

        return ok({
            items,
            page: request.page,
            pageSize: request.pageSize,
            total: result.value.total,
        });
    }
}
