import 'dotenv/config';
import { UserApiRepository } from './infrastructure/api/user-api-repository.ts';
import { runLoginMenu } from './infrastructure/ui/login-menu.ts';
import { runMainMenu } from './infrastructure/ui/main-menu.ts';

const baseUrl = process.env['API_BASE_URL'] ?? 'http://localhost:3000';
const repo = new UserApiRepository(baseUrl);

let authenticated = false;
while (!authenticated) {
  authenticated = await runLoginMenu(repo);
}

await runMainMenu(repo);
