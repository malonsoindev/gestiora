export class InvalidUserRolesError extends Error {
    constructor(message: string = 'User roles are invalid') {
        super(message);
        this.name = 'InvalidUserRolesError';
    }
}
