import type { SessionRepository } from '@application/ports/session.repository.js';
import type { UserRepository } from '@application/ports/user.repository.js';
import type { User } from '@domain/entities/user.entity.js';
import { SessionRepositorySpy } from '../spies/session-repository.spy.js';
import { UserRepositorySpy } from '../spies/user-repository.spy.js';

export const buildUserUseCaseSut = <T>(
    user: User | null,
    build: (userRepository: UserRepository) => T,
): { useCase: T; userRepository: UserRepositorySpy } => {
    const userRepository = new UserRepositorySpy(user);
    return { useCase: build(userRepository), userRepository };
};

export const buildUserSessionUseCaseSut = <T>(
    user: User | null,
    build: (userRepository: UserRepository, sessionRepository: SessionRepository) => T,
): { useCase: T; userRepository: UserRepositorySpy; sessionRepository: SessionRepositorySpy } => {
    const userRepository = new UserRepositorySpy(user);
    const sessionRepository = new SessionRepositorySpy();
    return { useCase: build(userRepository, sessionRepository), userRepository, sessionRepository };
};
