import 'dotenv/config';
import { UserApiRepository } from './infrastructure/api/user-api-repository.ts';
import { runLoginMenu } from './infrastructure/ui/login-menu.ts';
import { runMainMenu } from './infrastructure/ui/main-menu.ts';

console.clear();

const baseUrl = process.env['API_BASE_URL'] ?? 'http://localhost:3000';
const repo = new UserApiRepository(baseUrl);

const authenticated = await runLoginMenu(repo);
if (!authenticated) {
  process.exit(1);
}

await runMainMenu(repo);
