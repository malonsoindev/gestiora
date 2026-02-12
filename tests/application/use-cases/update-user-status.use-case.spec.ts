import { describe, expect, it } from 'vitest';
import { UpdateUserStatusUseCase } from '@application/use-cases/update-user-status.use-case.js';
import { UserStatus } from '@domain/entities/user.entity.js';
import { UserNotFoundError } from '@domain/errors/user-not-found.error.js';
import { InvalidUserStatusError } from '@domain/errors/invalid-user-status.error.js';
import { createTestUser } from '../../shared/fixtures/user.fixture.js';
import { buildUserUseCaseSut } from '../../shared/helpers/user-use-case-sut.js';

const fixedNow = new Date('2026-02-03T14:00:00.000Z');

describe('UpdateUserStatusUseCase', () => {
    it('updates user status', async () => {
        const { useCase, userRepository } = buildUserUseCaseSut(
            createTestUser({ now: fixedNow }),
            (userRepository) => new UpdateUserStatusUseCase({ userRepository, now: () => fixedNow }),
        );

        const result = await useCase.execute({ userId: 'user-1', status: UserStatus.Inactive });

        expect(result.success).toBe(true);
        expect(userRepository.updatedUser?.status).toBe(UserStatus.Inactive);
        expect(userRepository.updatedUser?.updatedAt).toBe(fixedNow);
    });

    it('rejects deleted status update', async () => {
        const { useCase } = buildUserUseCaseSut(
            createTestUser({ now: fixedNow }),
            (userRepository) => new UpdateUserStatusUseCase({ userRepository, now: () => fixedNow }),
        );

        const result = await useCase.execute({ userId: 'user-1', status: UserStatus.Deleted });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidUserStatusError);
        }
    });

    it('returns not found when user does not exist', async () => {
        const { useCase } = buildUserUseCaseSut(
            null,
            (userRepository) => new UpdateUserStatusUseCase({ userRepository, now: () => fixedNow }),
        );

        const result = await useCase.execute({ userId: 'missing-user', status: UserStatus.Active });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
    });
});
