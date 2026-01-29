import { checkHealth } from "src/shared/health.js";

const health = checkHealth();

console.log(`Health Status: ${health.status} at ${health.timestamp}`);