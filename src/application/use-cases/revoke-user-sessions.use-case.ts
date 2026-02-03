import type { RevokeUserSessionsRequest } from '../dto/revoke-user-sessions.request.js';
import type { UserRepository } from '../ports/user.repository.js';
import type { SessionRepository } from '../ports/session.repository.js';
import type { PortError } from '../errors/port.error.js';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error.js';
import { fail, ok, type Result } from '../../shared/result.js';

export type RevokeUserSessionsDependencies = {
    userRepository: UserRepository;
    sessionRepository: SessionRepository;
};

export type RevokeUserSessionsError = UserNotFoundError | PortError;

export class RevokeUserSessionsUseCase {
    constructor(private readonly dependencies: RevokeUserSessionsDependencies) {}

    async execute(
        request: RevokeUserSessionsRequest,
    ): Promise<Result<void, RevokeUserSessionsError>> {
        const userResult = await this.dependencies.userRepository.findById(request.userId);
        if (!userResult.success) {
            return fail(userResult.error);
        }

        if (!userResult.value) {
            return fail(new UserNotFoundError());
        }

        const revokeResult = await this.dependencies.sessionRepository.revokeByUserId(request.userId);
        if (!revokeResult.success) {
            return fail(revokeResult.error);
        }

        return ok(undefined);
    }
}
