export interface PasswordHasher {
    verify(plainText: string, hash: string): Promise<boolean>;
}
