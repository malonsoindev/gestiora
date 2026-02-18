import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleLogger } from '@infrastructure/adapters/logging/console-logger.js';

describe('ConsoleLogger', () => {
    beforeEach(() => {
        vi.spyOn(console, 'debug').mockImplementation(() => {});
        vi.spyOn(console, 'info').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('log methods', () => {
        it('should log debug messages', () => {
            const logger = new ConsoleLogger();
            logger.debug('debug message');

            expect(console.debug).toHaveBeenCalledTimes(1);
            expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('DEBUG'));
            expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('debug message'));
        });

        it('should log info messages', () => {
            const logger = new ConsoleLogger();
            logger.info('info message');

            expect(console.info).toHaveBeenCalledTimes(1);
            expect(console.info).toHaveBeenCalledWith(expect.stringContaining('INFO'));
        });

        it('should log warn messages', () => {
            const logger = new ConsoleLogger();
            logger.warn('warn message');

            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('WARN'));
        });

        it('should log error messages', () => {
            const logger = new ConsoleLogger();
            logger.error('error message');

            expect(console.error).toHaveBeenCalledTimes(1);
            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('ERROR'));
        });
    });

    describe('context', () => {
        it('should include context in log output', () => {
            const logger = new ConsoleLogger();
            logger.info('message', { userId: '123', action: 'test' });

            expect(console.info).toHaveBeenCalledWith(
                expect.stringContaining('{"userId":"123","action":"test"}')
            );
        });

        it('should not include context when empty', () => {
            const logger = new ConsoleLogger();
            logger.info('message', {});

            const call = vi.mocked(console.info).mock.calls[0][0] as string;
            expect(call).not.toContain('{}');
        });
    });

    describe('error with stack trace', () => {
        it('should log error stack when provided', () => {
            const logger = new ConsoleLogger();
            const error = new Error('test error');
            logger.error('error message', undefined, error);

            expect(console.error).toHaveBeenCalledTimes(2);
            expect(console.error).toHaveBeenNthCalledWith(2, error.stack);
        });
    });

    describe('minLevel filtering', () => {
        it('should filter debug when minLevel is info', () => {
            const logger = new ConsoleLogger({ minLevel: 'info' });
            logger.debug('should not appear');
            logger.info('should appear');

            expect(console.debug).not.toHaveBeenCalled();
            expect(console.info).toHaveBeenCalledTimes(1);
        });

        it('should filter debug and info when minLevel is warn', () => {
            const logger = new ConsoleLogger({ minLevel: 'warn' });
            logger.debug('no');
            logger.info('no');
            logger.warn('yes');

            expect(console.debug).not.toHaveBeenCalled();
            expect(console.info).not.toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalledTimes(1);
        });

        it('should only show errors when minLevel is error', () => {
            const logger = new ConsoleLogger({ minLevel: 'error' });
            logger.debug('no');
            logger.info('no');
            logger.warn('no');
            logger.error('yes');

            expect(console.debug).not.toHaveBeenCalled();
            expect(console.info).not.toHaveBeenCalled();
            expect(console.warn).not.toHaveBeenCalled();
            expect(console.error).toHaveBeenCalledTimes(1);
        });
    });

    describe('timestamp format', () => {
        it('should include ISO timestamp in output', () => {
            const logger = new ConsoleLogger();
            logger.info('test');

            const call = vi.mocked(console.info).mock.calls[0][0] as string;
            expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]/);
        });
    });
});
