import { describe, expect, it } from 'vitest';
import { RevokeUserSessionsUseCase } from '../../../src/application/use-cases/revoke-user-sessions.use-case.js';
import { UserNotFoundError } from '../../../src/domain/errors/user-not-found.error.js';
import { createTestUser } from '../../shared/fixtures/user.fixture.js';
import { buildUserSessionUseCaseSut } from '../../shared/helpers/user-use-case-sut.js';

const fixedNow = new Date('2026-02-03T17:00:00.000Z');

describe('RevokeUserSessionsUseCase', () => {
    it('revokes sessions for existing user', async () => {
        const { useCase, sessionRepository } = buildUserSessionUseCaseSut(
            createTestUser({ now: fixedNow }),
            (userRepository, sessionRepository) =>
                new RevokeUserSessionsUseCase({ userRepository, sessionRepository }),
        );

        const result = await useCase.execute({ userId: 'user-1' });

        expect(result.success).toBe(true);
        expect(sessionRepository.revokedForUserId).toBe('user-1');
    });

    it('returns not found when user does not exist', async () => {
        const { useCase } = buildUserSessionUseCaseSut(
            null,
            (userRepository, sessionRepository) =>
                new RevokeUserSessionsUseCase({ userRepository, sessionRepository }),
        );

        const result = await useCase.execute({ userId: 'missing-user' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
    });
});
