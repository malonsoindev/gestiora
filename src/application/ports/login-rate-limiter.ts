export interface LoginRateLimiter {
    assertAllowed(email: string, ip?: string): Promise<void>;
}
