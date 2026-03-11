const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

export function printSuccess(msg: string): void {
  console.log(`${GREEN}${msg}${RESET}`);
}

export function printError(msg: string): void {
  console.error(`${RED}${msg}${RESET}`);
}
