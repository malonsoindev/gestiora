import { describe, it, expect } from 'vitest';
import { checkHealth } from '@shared/health';

describe('checkHealth', () => {
    it('should return OK status and a valid timestamp', () => {
        const result = checkHealth();

        expect(result.status).toBe('OK');
        expect(result.timestamp).toBeDefined();
        expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
});
