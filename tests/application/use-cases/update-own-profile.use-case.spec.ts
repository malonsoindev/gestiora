import { describe, expect, it } from 'vitest';
import { UpdateOwnProfileUseCase } from '@application/use-cases/update-own-profile.use-case.js';
import { UserNotFoundError } from '@domain/errors/user-not-found.error.js';
import { createTestUser } from '@tests/shared/fixtures/user.fixture.js';
import { buildUserUseCaseSut } from '@tests/shared/helpers/user-use-case-sut.js';
import { DateProviderStub } from '@tests/shared/stubs/date-provider.stub.js';

const fixedNow = new Date('2026-02-03T16:00:00.000Z');
const dateProvider = new DateProviderStub(fixedNow);

describe('UpdateOwnProfileUseCase', () => {
    it('updates name and avatar for current user', async () => {
        const { useCase, userRepository } = buildUserUseCaseSut(
            createTestUser({ now: fixedNow, overrides: { id: 'user-1' } }),
            (userRepository) => new UpdateOwnProfileUseCase({ userRepository, dateProvider }),
        );

        const result = await useCase.execute({
            actorUserId: 'user-1',
            name: 'Updated',
            avatar: 'updated.png',
        });

        expect(result.success).toBe(true);
        expect(userRepository.updatedUser?.name).toBe('Updated');
        expect(userRepository.updatedUser?.avatar).toBe('updated.png');
        expect(userRepository.updatedUser?.updatedAt).toBe(fixedNow);
    });

    it('returns not found when user does not exist', async () => {
        const { useCase } = buildUserUseCaseSut(
            null,
            (userRepository) => new UpdateOwnProfileUseCase({ userRepository, dateProvider }),
        );

        const result = await useCase.execute({
            actorUserId: 'user-1',
            name: 'Updated',
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
    });
});
