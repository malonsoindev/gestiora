import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NoopLogger } from '@infrastructure/adapters/logging/noop-logger.js';

describe('NoopLogger', () => {
    beforeEach(() => {
        vi.spyOn(console, 'debug').mockImplementation(() => {});
        vi.spyOn(console, 'info').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should not produce any console output for debug', () => {
        const logger = new NoopLogger();
        logger.debug('message', { key: 'value' });

        expect(console.debug).not.toHaveBeenCalled();
    });

    it('should not produce any console output for info', () => {
        const logger = new NoopLogger();
        logger.info('message', { key: 'value' });

        expect(console.info).not.toHaveBeenCalled();
    });

    it('should not produce any console output for warn', () => {
        const logger = new NoopLogger();
        logger.warn('message', { key: 'value' });

        expect(console.warn).not.toHaveBeenCalled();
    });

    it('should not produce any console output for error', () => {
        const logger = new NoopLogger();
        logger.error('message', { key: 'value' }, new Error('test'));

        expect(console.error).not.toHaveBeenCalled();
    });

    it('should implement Logger interface correctly', () => {
        const logger = new NoopLogger();

        expect(typeof logger.debug).toBe('function');
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.error).toBe('function');
    });
});
