import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const promptsSourceDir = resolve(rootDir, 'prompts');
const promptsTargetDir = resolve(rootDir, 'dist', 'prompts');
const publicSourceDir = resolve(rootDir, 'public');
const publicTargetDir = resolve(rootDir, 'dist', 'public');

const copyDir = (sourceDir, targetDir, label) => {
    if (!existsSync(sourceDir)) {
        console.warn(`[copy-assets] Source directory not found (${label}):`, sourceDir);
        return;
    }

    if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
    }

    cpSync(sourceDir, targetDir, { recursive: true });
    console.log(`[copy-assets] Copied ${label} to`, targetDir);
};

copyDir(promptsSourceDir, promptsTargetDir, 'prompts');
copyDir(publicSourceDir, publicTargetDir, 'public');
