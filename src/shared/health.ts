/**
 * Trivial health check function to verify tooling and startup.
 */
export function checkHealth(): {status: string, timestamp: string} {
    return {
        status: 'OK',
        timestamp: new Date().toISOString()
    };
}
