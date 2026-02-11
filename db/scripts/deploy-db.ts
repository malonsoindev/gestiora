import { readFile } from 'node:fs/promises';
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
        const filePath = new URL('../migrations/999-db-deploy.sql', import.meta.url);
        const script = await readFile(filePath, 'utf-8');
        await sql.unsafe(script);
        console.log('Database deploy script applied');
    } finally {
        await sql.end();
    }
};

await run().catch((error) => {
    console.error('Failed to deploy database:', error);
    process.exit(1);
});
