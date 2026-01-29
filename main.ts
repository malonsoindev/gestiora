import { buildServer } from './src/infrastructure/delivery/http/server.js';
import { seedUsers } from './src/composition/index.js';

const start = async () => {
    seedUsers();
    const app = buildServer();
    const port = Number(process.env.PORT ?? 3000);

    await app.listen({ port, host: '0.0.0.0' });
};

start().catch((error) => {
    console.error(error);
    process.exit(1);
});
