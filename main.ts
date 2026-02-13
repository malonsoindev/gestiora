import { buildServer } from '@infrastructure/delivery/http/server.js';
import { compositionRoot, seedUsers } from '@composition/index.js';
import { config } from '@config/env.js';

const start = async () => {
    await seedUsers();
    const reindexResult = await compositionRoot.ragReindexAllInvoicesService.reindexAll();
    if (!reindexResult.success) {
        throw reindexResult.error;
    }
    const app = await buildServer();
    const port = config.PORT;

    await app.listen({ port, host: '0.0.0.0' });
};

await start().catch((error) => {
    console.error(error);
    process.exit(1);
});
