export interface RefreshTokenHasher {
    hash(value: string): string;
}
