import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const filename = fileURLToPath(import.meta.url);
const currentDir = dirname(filename);

export default defineConfig({
    test: {
        include: ['tests/**/*.spec.ts', 'src/**/*.spec.ts'],
        environment: 'node',
        globals: true,
    },
    resolve: {
        alias: {
            '@domain': resolve(currentDir, './src/domain'),
            '@application': resolve(currentDir, './src/application'),
            '@infrastructure': resolve(currentDir, './src/infrastructure'),
            '@composition': resolve(currentDir, './src/composition'),
            '@config': resolve(currentDir, './src/config'),
            '@shared': resolve(currentDir, './src/shared'),
        },
    },
});
