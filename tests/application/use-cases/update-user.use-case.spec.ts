import { describe, expect, it } from 'vitest';
import { UpdateUserUseCase } from '../../../src/application/use-cases/update-user.use-case.js';
import { UserStatus } from '../../../src/domain/entities/user.entity.js';
import { UserRole } from '../../../src/domain/value-objects/user-role.value-object.js';
import { UserNotFoundError } from '../../../src/domain/errors/user-not-found.error.js';
import { InvalidUserRolesError } from '../../../src/domain/errors/invalid-user-roles.error.js';
import { InvalidUserStatusError } from '../../../src/domain/errors/invalid-user-status.error.js';
import { createTestUser } from '../../shared/fixtures/user.fixture.js';
import { buildUserUseCaseSut } from '../../shared/helpers/user-use-case-sut.js';

const fixedNow = new Date('2026-02-03T13:00:00.000Z');

describe('UpdateUserUseCase', () => {
    it('updates name, avatar, roles and status', async () => {
        const { useCase, userRepository } = buildUserUseCaseSut(
            createTestUser({ now: fixedNow }),
            (userRepository) => new UpdateUserUseCase({ userRepository, now: () => fixedNow }),
        );

        const result = await useCase.execute({
            userId: 'user-1',
            name: 'Updated',
            avatar: 'updated.png',
            roles: [UserRole.admin()],
            status: UserStatus.Inactive,
        });

        expect(result.success).toBe(true);
        expect(userRepository.updatedUser?.name).toBe('Updated');
        expect(userRepository.updatedUser?.avatar).toBe('updated.png');
        expect(userRepository.updatedUser?.roles[0]?.getValue()).toBe('ADMIN');
        expect(userRepository.updatedUser?.status).toBe(UserStatus.Inactive);
        expect(userRepository.updatedUser?.updatedAt).toBe(fixedNow);
    });

    it('rejects empty roles', async () => {
        const { useCase } = buildUserUseCaseSut(
            createTestUser({ now: fixedNow }),
            (userRepository) => new UpdateUserUseCase({ userRepository, now: () => fixedNow }),
        );

        const result = await useCase.execute({
            userId: 'user-1',
            roles: [],
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidUserRolesError);
        }
    });

    it('rejects deleted status update', async () => {
        const { useCase } = buildUserUseCaseSut(
            createTestUser({ now: fixedNow }),
            (userRepository) => new UpdateUserUseCase({ userRepository, now: () => fixedNow }),
        );

        const result = await useCase.execute({
            userId: 'user-1',
            status: UserStatus.Deleted,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(InvalidUserStatusError);
        }
    });

    it('returns not found when user does not exist', async () => {
        const { useCase } = buildUserUseCaseSut(
            null,
            (userRepository) => new UpdateUserUseCase({ userRepository, now: () => fixedNow }),
        );

        const result = await useCase.execute({ userId: 'missing-user' });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(UserNotFoundError);
        }
    });
});
