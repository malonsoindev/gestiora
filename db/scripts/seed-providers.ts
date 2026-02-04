import postgres from 'postgres';

import { config } from '../../src/config/env.js';

const databaseUrl = config.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const normalizeText = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

const run = async () => {
    const sql = postgres(databaseUrl);
    try {
        const now = new Date();

        await sql`
            insert into providers (
                id,
                razon_social,
                razon_social_normalized,
                cif,
                direccion,
                poblacion,
                provincia,
                pais,
                status,
                created_at,
                updated_at,
                deleted_at
            ) values (
                'provider-1',
                'Proveedor Alpha SL',
                ${normalizeText('Proveedor Alpha SL')},
                'B12345678',
                'Calle Mayor 1',
                'Madrid',
                'Madrid',
                'ES',
                'ACTIVE',
                ${now},
                ${now},
                null
            )
            on conflict (id) do nothing
        `;

        await sql`
            insert into providers (
                id,
                razon_social,
                razon_social_normalized,
                cif,
                direccion,
                poblacion,
                provincia,
                pais,
                status,
                created_at,
                updated_at,
                deleted_at
            ) values (
                'provider-2',
                'Proveedor Beta SL',
                ${normalizeText('Proveedor Beta SL')},
                'A87654321',
                'Avenida Diagonal 100',
                'Barcelona',
                'Barcelona',
                'ES',
                'ACTIVE',
                ${now},
                ${now},
                null
            )
            on conflict (id) do nothing
        `;

        console.log('Seed providers applied');
    } finally {
        await sql.end();
    }
};

await run().catch((error) => {
    console.error('Failed to seed providers:', error);
    process.exit(1);
});
