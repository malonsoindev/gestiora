import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const sourceDir = resolve(rootDir, 'prompts');
const targetDir = resolve(rootDir, 'dist', 'prompts');

if (!existsSync(sourceDir)) {
    console.warn('[copy-prompts] Source directory not found:', sourceDir);
    process.exit(0);
}

if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
}

cpSync(sourceDir, targetDir, { recursive: true });
console.log('[copy-prompts] Copied prompts to', targetDir);
