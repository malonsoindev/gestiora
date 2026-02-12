import type { AuditLogger } from '@application/ports/audit-logger.js';
import type { PasswordHasher } from '@application/ports/password-hasher.js';
import type { UserRepository } from '@application/ports/user.repository.js';
import type { PortError } from '@application/errors/port.error.js';
import { InvalidPasswordError } from '@domain/errors/invalid-password.error.js';
import { Password } from '@domain/value-objects/password.value-object.js';
import type { User } from '@domain/entities/user.entity.js';
import { fail, ok, type Result } from '@shared/result.js';

export type ApplyPasswordChangeDependencies = {
    userRepository: UserRepository;
    passwordHasher: PasswordHasher;
    auditLogger: AuditLogger;
};

export type ApplyPasswordChangeError = InvalidPasswordError | PortError;

export const applyPasswordChange = async (params: {
    user: User;
    actorUserId: string;
    newPassword: string;
    now: Date;
    dependencies: ApplyPasswordChangeDependencies;
}): Promise<Result<void, ApplyPasswordChangeError>> => {
    const passwordResult = buildPassword(params.newPassword);
    if (!passwordResult.success) {
        return fail(passwordResult.error);
    }

    const hashResult = await params.dependencies.passwordHasher.hash(passwordResult.value.getValue());
    if (!hashResult.success) {
        return fail(hashResult.error);
    }

    const updated = params.user.updateInfo({
        passwordHash: hashResult.value,
        updatedAt: params.now,
    });

    const updateResult = await params.dependencies.userRepository.update(updated);
    if (!updateResult.success) {
        return fail(updateResult.error);
    }

    const auditResult = await params.dependencies.auditLogger.log({
        action: 'USER_PASSWORD_CHANGED',
        actorUserId: params.actorUserId,
        targetUserId: params.user.id,
        createdAt: params.now,
    });
    if (!auditResult.success) {
        return fail(auditResult.error);
    }

    return ok(undefined);
};

const buildPassword = (password: string): Result<Password, InvalidPasswordError> => {
    try {
        return ok(Password.create(password));
    } catch (error) {
        if (error instanceof InvalidPasswordError) {
            return fail(error);
        }
        throw error;
    }
};
