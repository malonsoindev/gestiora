export interface UserRepository {
  login(email: string, password: string): Promise<string>;
  listUsers(): Promise<import('./user.ts').User[]>;
  findUsers(query: string): Promise<import('./user.ts').User[]>;
  updateUser(id: string, payload: import('./user.ts').UpdateUserPayload): Promise<import('./user.ts').User>;
  disableUser(id: string): Promise<void>;
  resetPassword(id: string, payload: import('./user.ts').ResetPasswordPayload): Promise<void>;
}
