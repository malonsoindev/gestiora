import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';

import { config } from '../../src/config/env.js';

const databaseUrl = config.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const run = async () => {
    const sql = postgres(databaseUrl);
    try {
        const migrationsDir = new URL('../migrations/', import.meta.url);
        const entries = await readdir(migrationsDir, { withFileTypes: true });
        const migrationFiles = entries
            .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
            .map((entry) => entry.name)
            .sort();

        if (migrationFiles.length === 0) {
            console.log('No migration files found');
            return;
        }

        for (const fileName of migrationFiles) {
            const filePath = new URL(`../migrations/${fileName}`, import.meta.url);
            const script = await readFile(filePath, 'utf-8');
            await sql.unsafe(script);
            console.log(`Applied migration: ${fileName}`);
        }

        console.log('Database migrations applied');
    } finally {
        await sql.end();
    }
};

await run().catch((error) => {
    console.error('Failed to apply schema:', error);
    process.exit(1);
});
