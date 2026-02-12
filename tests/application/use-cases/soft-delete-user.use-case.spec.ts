import { describe, expect, it } from 'vitest';
import { SoftDeleteUserUseCase } from '@application/use-cases/soft-delete-user.use-case.js';
import { UserStatus } from '@domain/entities/user.entity.js';
import { UserRole } from '@domain/value-objects/user-role.value-object.js';
import { UserNotFoundError } from '@domain/errors/user-not-found.error.js';
import { SelfDeletionNotAllowedError } from '@domain/errors/self-deletion-not-allowed.error.js';
import { createTestUser } from '../../shared/fixtures/user.fixture.js';
import { buildUserSessionUseCaseSut } from '../../shared/helpers/user-use-case-sut.js';

const fixedNow = new Date('2026-02-03T15:00:00.000Z');

describe('SoftDeleteUserUseCase', () => {
    it('marks user as deleted and revokes sessions', async () => {
        const user = createTestUser({ now: fixedNow });
        const { useCase, userRepository, sessionRepository } = buildUserSessionUseCaseSut(
            user,
            (userRepository, sessionRepository) =>
                new SoftDeleteUserUseCase({
                    userRepository,
                    sessionRepository,
                    now: () => fixedNow,
                }),
        );

        const result = await useCase.execute({ userId: 'user-1', actorUserId: 'admin-1' });

        expect(result.success).toBe(true);
        expect(userRepository.updatedUser?.status).toBe(UserStatus.Deleted);
        expect(userRepository.updatedUser?.deletedAt).toBe(fixedNow);
        expect(userRepository.updatedUser?.updatedAt).toBe(fixedNow);
        expect(sessionRepository.revokedForUserId).toBe('user-1');
    });

    it('returns not found when user does not exist', async () => {
        const { useCase } = buildUserSessionUseCaseSut(
            null,
            (userRepository, sessionRepository) =>
                new SoftDeleteUserUseCase({
                    userRepository,
                    sessionRepository,
                    now: () => fixedNow,
                }),
        );

        const result = await useCase.execute({ userId: 'missing-user', actorUserId: 'admin-1' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
    });

    it('rejects self deletion', async () => {
        const user = createTestUser({
            now: fixedNow,
            overrides: { id: 'admin-1', roles: [UserRole.admin()] },
        });
        const { useCase } = buildUserSessionUseCaseSut(
            user,
            (userRepository, sessionRepository) =>
                new SoftDeleteUserUseCase({
                    userRepository,
                    sessionRepository,
                    now: () => fixedNow,
                }),
        );

        const result = await useCase.execute({ userId: 'admin-1', actorUserId: 'admin-1' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(SelfDeletionNotAllowedError);
        }
    });
});
