import { buildServer } from './src/infrastructure/delivery/http/server.js';
import { seedUsers } from './src/composition/index.js';
import { config } from './src/config/env.js';

const start = async () => {
    await seedUsers();
    const app = await buildServer();
    const port = config.PORT;

    await app.listen({ port, host: '0.0.0.0' });
};

await start().catch((error) => {
    console.error(error);
    process.exit(1);
});