import bcrypt from 'bcrypt';
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
        const now = new Date();
        const saltRounds = 12;
        const adminHash = await bcrypt.hash('AdminPass1!a', saltRounds);
        const userHash = await bcrypt.hash('UserPass1!a01', saltRounds);

        await sql`
            insert into users (id, email, password_hash, status, locked_until, roles, created_at, updated_at, name, avatar)
            values (
                'admin-1',
                'admin@example.com',
                ${adminHash},
                'ACTIVE',
                null,
                ${['ADMIN']}::text[],
                ${now},
                ${now},
                'Admin User',
                null
            )
            on conflict (email) do nothing
        `;

        await sql`
            insert into users (id, email, password_hash, status, locked_until, roles, created_at, updated_at, name, avatar)
            values (
                'user-1',
                'user@example.com',
                ${userHash},
                'ACTIVE',
                null,
                ${['USER']}::text[],
                ${now},
                ${now},
                'Regular User',
                null
            )
            on conflict (email) do nothing
        `;

        console.log('Seed users applied');
    } finally {
        await sql.end();
    }
};

await run().catch((error) => {
    console.error('Failed to seed users:', error);
    process.exit(1);
});
